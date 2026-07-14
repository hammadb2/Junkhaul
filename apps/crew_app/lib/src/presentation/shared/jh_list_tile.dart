import 'package:flutter/material.dart';

import '../../core/app_theme.dart';

class JhListTile extends StatelessWidget {
  const JhListTile({
    super.key,
    required this.title,
    this.subtitle,
    this.leadingIcon,
    this.onTap,
    this.trailing = const Icon(Icons.chevron_right, color: AppColors.textDisabled),
  });

  final String title;
  final String? subtitle;
  final IconData? leadingIcon;
  final VoidCallback? onTap;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      contentPadding: const EdgeInsets.symmetric(horizontal: 0, vertical: 4),
      leading: leadingIcon != null
          ? Icon(leadingIcon, color: AppColors.textSecondary)
          : null,
      title: Text(
        title,
        style: const TextStyle(
          color: AppColors.textPrimary,
          fontSize: 15,
          fontWeight: FontWeight.w600,
        ),
      ),
      subtitle: subtitle != null
          ? Text(
              subtitle!,
              style: const TextStyle(
                color: AppColors.textSecondary,
                fontSize: 13,
                fontWeight: FontWeight.w400,
              ),
            )
          : null,
      trailing: trailing,
      onTap: onTap,
      minLeadingWidth: 24,
      horizontalTitleGap: 12,
    );
  }
}
