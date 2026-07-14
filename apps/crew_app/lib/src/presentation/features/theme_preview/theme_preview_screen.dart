import 'package:flutter/material.dart';

import '../../../core/app_theme.dart';
import '../../shared/shared.dart';

class ThemePreviewScreen extends StatelessWidget {
  const ThemePreviewScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    return Scaffold(
      appBar: AppBar(title: const Text('Theme Preview')),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            _section('Colors'),
            Wrap(
              spacing: 12,
              runSpacing: 12,
              children: [
                _colorChip('accent', AppColors.accent),
                _colorChip('accentDark', AppColors.accentDark),
                _colorChip('bgBase', AppColors.bgBase, border: true),
                _colorChip('bgCard', AppColors.bgCard, border: true),
                _colorChip('bgInput', AppColors.bgInput, border: true),
                _colorChip('textPrimary', AppColors.textPrimary),
                _colorChip('textSecondary', AppColors.textSecondary),
                _colorChip('textDisabled', AppColors.textDisabled),
                _colorChip('statusGreen', AppColors.statusGreen),
                _colorChip('statusAmber', AppColors.statusAmber),
                _colorChip('statusGray', AppColors.statusGray),
                _colorChip('statusRed', AppColors.statusRed),
                _colorChip('borderSubtle', AppColors.borderSubtle, border: true),
              ],
            ),
            const SizedBox(height: 24),
            _section('Typography'),
            Text('displayLarge 32/800', style: textTheme.displayLarge),
            Text('headlineSmall 22/700', style: textTheme.headlineSmall),
            Text('titleMedium 17/600', style: textTheme.titleMedium),
            Text('bodyMedium 15/400', style: textTheme.bodyMedium),
            Text('labelSmall 13/500', style: textTheme.labelSmall),
            const SizedBox(height: 8),
            Text(
              'Tabular: \$1,234.56  00:12:34  #12345',
              style: AppTheme.tabularTextStyle(textTheme.bodyMedium),
            ),
            const SizedBox(height: 24),
            _section('Buttons'),
            JhPrimaryButton(
              label: 'Primary Button',
              onPressed: () {},
            ),
            const SizedBox(height: 12),
            JhSecondaryButton(
              label: 'Secondary Button',
              onPressed: () {},
            ),
            const SizedBox(height: 12),
            const JhPrimaryButton(
              label: 'Disabled Primary',
              onPressed: null,
            ),
            const SizedBox(height: 24),
            _section('Card'),
            JhCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Card title', style: textTheme.titleMedium),
                  const SizedBox(height: 4),
                  Text('Card subtitle text', style: textTheme.bodyMedium),
                ],
              ),
            ),
            const SizedBox(height: 24),
            _section('Status Pills'),
            const Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                JhStatusPill(label: 'Active', color: AppColors.statusGreen),
                JhStatusPill(label: 'Pending', color: AppColors.statusAmber),
                JhStatusPill(label: 'Offline', color: AppColors.statusGray),
                JhStatusPill(label: 'Error', color: AppColors.statusRed),
              ],
            ),
            const SizedBox(height: 24),
            _section('Skeleton'),
            const JhSkeleton(width: double.infinity, height: 80),
            const SizedBox(height: 24),
            _section('Error Banner'),
            JhErrorBanner(
              message: 'Something went wrong.',
              onRetry: () {},
            ),
            const SizedBox(height: 24),
            _section('Bottom Sheet Handle'),
            const Center(child: JhBottomSheetHandle()),
            const SizedBox(height: 24),
            _section('Text Field'),
            const JhTextField(
              label: 'Label',
              hint: 'Hint text',
              prefixIcon: Icon(Icons.person, color: AppColors.textSecondary),
            ),
            const SizedBox(height: 24),
            _section('List Tile'),
            JhListTile(
              title: 'List tile title',
              subtitle: 'Subtitle text',
              leadingIcon: Icons.settings,
              onTap: () {},
            ),
            const SizedBox(height: 24),
            _section('Photo Thumbnail'),
            const JhPhotoThumbnail(
              imageUrl: 'https://via.placeholder.com/150',
              size: 120,
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }

  Widget _section(String title) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Text(
        title,
        style: const TextStyle(
          color: AppColors.textSecondary,
          fontSize: 13,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }

  Widget _colorChip(String label, Color color, {bool border = false}) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 48,
          height: 48,
          decoration: BoxDecoration(
            color: color,
            borderRadius: BorderRadius.circular(8),
            border: border
                ? Border.all(color: AppColors.borderSubtle, width: 1)
                : null,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          label,
          style: const TextStyle(
            color: AppColors.textSecondary,
            fontSize: 10,
          ),
        ),
      ],
    );
  }
}
