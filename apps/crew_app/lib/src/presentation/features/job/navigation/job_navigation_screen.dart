import 'package:flutter/material.dart';
import '../../../../core/app_theme.dart';

enum CrewNavMode { turnByTurn, freeDrive }

/// In-app turn-by-turn navigation — consumes the crew's optimized
/// multi-stop route directly instead of handing off to an external maps
/// app, so the stop sequence and live rerouting survive.
///
/// TODO(dev): replace the map placeholder and maneuver banner with the
/// Mapbox Navigation SDK's own view + maneuver/trip-progress components
/// (NavigationView / banner instructions / progress bar), and call
/// [onArrive] from the SDK's arrival callback instead of a manual button
/// once arrival detection is wired up. [mode] toggles between full
/// turn-by-turn (getting to a job) and free-drive (position-only, no set
/// destination — may suit the schedule/overview map instead).
class JobNavigationScreen extends StatelessWidget {
  const JobNavigationScreen({
    super.key,
    required this.mode,
    required this.onModeChanged,
    required this.onArrive,
    this.nextManeuver,
    this.maneuverDistance,
    this.etaMinutes,
    this.remainingKm,
  });

  final CrewNavMode mode;
  final ValueChanged<CrewNavMode> onModeChanged;
  final VoidCallback onArrive;
  final String? nextManeuver;
  final String? maneuverDistance;
  final int? etaMinutes;
  final double? remainingKm;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFDCE4E0),
      body: Stack(
        children: [
          const Positioned.fill(
            child: Center(child: Icon(Icons.map_outlined, size: 40, color: Color(0xFFB7C2BC))),
          ),
          SafeArea(
            child: Column(
              children: [
                if (mode == CrewNavMode.turnByTurn && nextManeuver != null)
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
                    child: Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(color: AppColors.textPrimary, borderRadius: BorderRadius.circular(16)),
                      child: Row(
                        children: [
                          const Icon(Icons.turn_right_rounded, color: Colors.white, size: 32),
                          const SizedBox(width: 14),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(nextManeuver!, style: const TextStyle(fontSize: 19, fontWeight: FontWeight.w700, color: Colors.white)),
                              if (maneuverDistance != null)
                                Text(maneuverDistance!, style: TextStyle(fontSize: 13, color: Colors.white.withOpacity(0.7))),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                const Spacer(),
              ],
            ),
          ),
          Positioned(
            top: 68,
            right: 16,
            child: Column(
              children: [
                _ModeChip(label: 'Turn-by-turn', selected: mode == CrewNavMode.turnByTurn, onTap: () => onModeChanged(CrewNavMode.turnByTurn)),
                const SizedBox(height: 8),
                _ModeChip(label: 'Free drive', selected: mode == CrewNavMode.freeDrive, onTap: () => onModeChanged(CrewNavMode.freeDrive)),
              ],
            ),
          ),
          Align(
            alignment: Alignment.bottomCenter,
            child: SafeArea(
              top: false,
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.fromLTRB(20, 16, 20, 20),
                decoration: const BoxDecoration(color: AppColors.bgCard, borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(etaMinutes != null ? '$etaMinutes min' : '—', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: AppColors.textPrimary)),
                            Text(remainingKm != null ? '${remainingKm!.toStringAsFixed(1)} km remaining' : '', style: const TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                          ],
                        ),
                        Container(
                          width: 38,
                          height: 38,
                          decoration: const BoxDecoration(color: AppColors.bgInput, shape: BoxShape.circle),
                          child: const Icon(Icons.volume_up_outlined, size: 18, color: AppColors.textPrimary),
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),
                    SizedBox(
                      width: double.infinity,
                      height: 56,
                      child: ElevatedButton(
                        onPressed: onArrive,
                        style: ElevatedButton.styleFrom(backgroundColor: AppColors.accent, foregroundColor: Colors.white, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14))),
                        child: const Text("I've Arrived", style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700)),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ModeChip extends StatelessWidget {
  const _ModeChip({required this.label, required this.selected, required this.onTap});
  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: selected ? AppColors.accent : Colors.white,
      borderRadius: BorderRadius.circular(999),
      child: InkWell(
        borderRadius: BorderRadius.circular(999),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          child: Text(label, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: selected ? Colors.white : AppColors.textPrimary)),
        ),
      ),
    );
  }
}
