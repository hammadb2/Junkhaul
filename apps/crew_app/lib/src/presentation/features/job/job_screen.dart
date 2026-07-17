import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../core/app_theme.dart';
import '../../../data/api/employee_api.dart';
import '../../../data/services/camera_service.dart';
import '../../../domain/models/job.dart';
import '../../../domain/models/payment.dart';
import '../../shared/jh_step_progress.dart';
import '../../shared/jh_sync_banner.dart';
import '../../shared/jh_primary_button.dart';
import 'navigation/job_navigation_screen.dart';
import 'steps/en_route_step.dart';
import 'steps/arrived_step.dart';
import 'steps/before_after_step.dart';
import 'steps/payment_step.dart';
import 'steps/load_truck_step.dart';
import 'steps/truck_fullness_step.dart';
import 'steps/route_decision_step.dart';
import 'steps/drop_flow_step.dart';
import 'steps/signature_step.dart';

/// Dispatch phone number for crew to call during a job.
const _dispatchPhone = '+15873250751';

enum _JobStep { enRoute, arrived, before, payment, load, fullness, route, drop, signature, complete }

/// The container that hosts all 9 job steps, in-app navigation, and the
/// final "Job Complete!" celebration. Forward-only — no back navigation
/// between steps, matching the existing app's flow.
class JobScreen extends ConsumerStatefulWidget {
  const JobScreen({
    super.key,
    required this.job,
    required this.syncState,
    required this.onJobComplete,
    this.queuedActionCount = 0,
    this.bookingId,
  });

  final Job job;
  final SyncState syncState;
  final VoidCallback onJobComplete;
  final int queuedActionCount;
  final String? bookingId;

  @override
  ConsumerState<JobScreen> createState() => _JobScreenState();
}

class _JobScreenState extends ConsumerState<JobScreen> {
  _JobStep _step = _JobStep.enRoute;
  bool _showingNavigation = false;
  CrewNavMode _navMode = CrewNavMode.turnByTurn;

  late List<JobItem> _items = List.of(widget.job.items);
  bool _loadBigger = false;
  double? get _adjustedAmount => _loadBigger ? widget.job.totalAmount + 80 : null;

  File? _beforePhoto;
  File? _truckBedPhoto;
  File? _dropPhoto;
  File? _afterPhoto;
  bool _hazmatFlag = false;
  RouteChoice _routeChoice = RouteChoice.landfillRun;
  PaymentResult? _payment;

  /// Error message shown in a snackbar when an API call fails.
  String? _lastError;

  static const _stepLabels = ['En Route', 'Item Conditions', 'Before Photo', 'Payment', 'Load Truck', 'Truck Fullness', 'Route Decision', 'Drop-off', 'Signature'];

  int get _stepIndex => _JobStep.values.indexOf(_step);

  void _goTo(_JobStep step) => setState(() => _step = step);

  void _showError(String message) {
    setState(() => _lastError = message);
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: AppColors.statusRed,
        duration: const Duration(seconds: 4),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_showingNavigation) {
      return JobNavigationScreen(
        mode: _navMode,
        onModeChanged: (m) => setState(() => _navMode = m),
        job: widget.job,
        onArrive: () => setState(() {
          _showingNavigation = false;
          _step = _JobStep.arrived;
        }),
      );
    }

    if (_step == _JobStep.complete) {
      return _CompleteScreen(job: widget.job, finalAmount: _payment?.amount ?? widget.job.totalAmount, onDone: widget.onJobComplete);
    }

    return Scaffold(
      backgroundColor: AppColors.bgBase,
      body: SafeArea(
        child: Column(
          children: [
            JhSyncBanner(state: widget.syncState, queuedActionCount: widget.queuedActionCount),
            if (_stepIndex < _stepLabels.length)
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
                child: JhStepProgress(currentStep: _stepIndex + 1, totalSteps: _stepLabels.length, stepLabel: _stepLabels[_stepIndex]),
              ),
            Expanded(child: _buildStep()),
          ],
        ),
      ),
    );
  }

  Widget _buildStep() {
    switch (_step) {
      case _JobStep.enRoute:
        return EnRouteStep(
          job: widget.job,
          etaMinutes: null,
          distanceKm: null,
          onStartNavigation: () => setState(() => _showingNavigation = true),
        );
      case _JobStep.arrived:
        return ArrivedStep(
          job: widget.job.copyWithItems(_items),
          onConfirm: () {
            _submitItemConditions();
            _goTo(_JobStep.before);
          },
          onCallCustomer: () => _callCustomer(widget.job.customer.phone),
          onLeaveNotice: () => _callCustomer(widget.job.customer.phone),
          onWait: () {},
        );
      case _JobStep.before:
        return BeforeAfterStep(
          photoFile: _beforePhoto,
          hazmatFlag: _hazmatFlag,
          onCapture: () async {
            final file = await ref.read(cameraServiceProvider).capturePhoto();
            if (file != null) setState(() => _beforePhoto = file);
          },
          onCallDispatch: () => _callCustomer(_dispatchPhone),
          onDismissHazmatFlag: () => setState(() => _hazmatFlag = false),
          onNext: () => _goTo(_JobStep.payment),
        );
      case _JobStep.payment:
        return PaymentStep(
          job: widget.job.copyWithAmount(_adjustedAmount),
          cardLast4: null,
          onConfirm: (result) {
            setState(() => _payment = result);
            _goTo(_JobStep.load);
          },
        );
      case _JobStep.load:
        return LoadTruckStep(
          items: _items,
          adjustedTotal: _adjustedAmount,
          onAddFoundItem: () => setState(() {
            _items = [..._items, JobItem(id: 'found-${_items.length}', name: 'Item found onsite', quantity: 1)];
            _loadBigger = true;
          }),
          onSendPriceUpdate: () => _resendPaymentLink(),
          onDone: () => _goTo(_JobStep.fullness),
        );
      case _JobStep.fullness:
        return TruckFullnessStep(
          photoFile: _truckBedPhoto,
          capacityUsedPercent: null,
          nextJobSummary: null,
          onCapture: () async {
            final file = await ref.read(cameraServiceProvider).capturePhoto();
            if (file != null) setState(() => _truckBedPhoto = file);
          },
          onNext: () => _goTo(_JobStep.route),
        );
      case _JobStep.route:
        return RouteDecisionStep(
          onConfirm: (choice) {
            setState(() => _routeChoice = choice);
            _goTo(_JobStep.drop);
          },
        );
      case _JobStep.drop:
        return DropFlowStep(
          choice: _routeChoice,
          facilityName: null,
          photoFile: _dropPhoto,
          capacityAfterPercent: null,
          onCapture: () async {
            final file = await ref.read(cameraServiceProvider).capturePhoto();
            if (file != null) setState(() => _dropPhoto = file);
          },
          onConfirm: () => _goTo(_JobStep.signature),
        );
      case _JobStep.signature:
        return SignatureStep(
          confirmedAmount: _payment?.amount ?? widget.job.totalAmount,
          customerName: widget.job.customer.name,
          afterPhotoFile: _afterPhoto,
          isSynced: widget.syncState == SyncState.online,
          onCapturePhoto: () async {
            final file = await ref.read(cameraServiceProvider).capturePhoto();
            if (file != null) setState(() => _afterPhoto = file);
          },
          onComplete: ({required signedByDelegate}) {
            _submitSignature(
              customerName: widget.job.customer.name,
              amount: _payment?.amount ?? widget.job.totalAmount,
              paymentMethod: _payment?.method.name ?? 'card_on_file',
              signedByDelegate: signedByDelegate,
            );
            _goTo(_JobStep.complete);
          },
        );
      case _JobStep.complete:
        return const SizedBox.shrink();
    }
  }

  // ---- Real API wiring ----

  Future<void> _callCustomer(String? phone) async {
    if (phone == null || phone.isEmpty) return;
    final uri = Uri.parse('tel:$phone');
    if (await canLaunchUrl(uri)) await launchUrl(uri);
  }

  Future<void> _submitItemConditions() async {
    if (widget.bookingId == null) return;
    try {
      final api = await ref.read(employeeApiProvider.future);
      final conditions = <String, String>{};
      for (final item in _items) {
        if (item.condition != null) {
          conditions[item.id] = item.condition!.name;
        }
      }
      if (conditions.isNotEmpty) {
        await api.submitItemConditions(
          bookingId: widget.bookingId!,
          conditions: conditions,
        );
      }
    } catch (e) {
      _showError('Failed to save item conditions: $e');
    }
  }

  Future<void> _resendPaymentLink() async {
    if (widget.bookingId == null) return;
    try {
      final api = await ref.read(employeeApiProvider.future);
      await api.resendPaymentLink(bookingId: widget.bookingId!);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Payment link sent to customer'), duration: Duration(seconds: 2)),
        );
      }
    } catch (e) {
      _showError('Failed to send payment link: $e');
    }
  }

  Future<void> _submitSignature({
    required String customerName,
    required double amount,
    required String paymentMethod,
    bool signedByDelegate = false,
  }) async {
    if (widget.bookingId == null) return;
    try {
      final api = await ref.read(employeeApiProvider.future);
      await api.submitSignature(
        bookingId: widget.bookingId!,
        customerNameTyped: customerName,
        amountConfirmed: amount,
        paymentMethod: paymentMethod,
      );
    } catch (e) {
      _showError('Failed to submit signature: $e');
    }
  }
}

class _CompleteScreen extends StatelessWidget {
  const _CompleteScreen({required this.job, required this.finalAmount, required this.onDone});
  final Job job;
  final double finalAmount;
  final VoidCallback onDone;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bgBase,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: Column(
            children: [
              Expanded(
                child: Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        width: 84,
                        height: 84,
                        decoration: const BoxDecoration(color: AppColors.statusGreen, shape: BoxShape.circle),
                        child: const Icon(Icons.check_rounded, color: Colors.white, size: 40),
                      ),
                      const SizedBox(height: 20),
                      const Text('Job Complete!', style: TextStyle(fontSize: 26, fontWeight: FontWeight.w800, color: AppColors.textPrimary)),
                      const SizedBox(height: 8),
                      Text('${job.customer.name} · ${job.customer.address}', style: const TextStyle(fontSize: 15, color: AppColors.textSecondary)),
                      const SizedBox(height: 24),
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(18),
                        decoration: BoxDecoration(color: AppColors.bgCard, borderRadius: BorderRadius.circular(16), border: Border.all(color: AppColors.borderSubtle)),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceAround,
                          children: [
                            _stat('Charged', '\$${finalAmount.toStringAsFixed(0)}'),
                            _stat('Duration', '—'),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              Padding(
                padding: const EdgeInsets.only(bottom: 26),
                child: JhPrimaryButton(label: 'Back to Schedule', onPressed: onDone),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _stat(String label, String value) {
    return Column(
      children: [
        Text(label, style: const TextStyle(fontSize: 12, color: AppColors.textSecondary)),
        const SizedBox(height: 2),
        Text(value, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: AppColors.textPrimary)),
      ],
    );
  }
}
