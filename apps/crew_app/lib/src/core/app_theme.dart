import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppColors {
  AppColors._();

  static const Color accent = Color(0xFFF97316);
  static const Color accentDark = Color(0xFFEA580C);

  static const Color bgBase = Color(0xFFFAFAFA);
  static const Color bgCard = Color(0xFFFFFFFF);
  static const Color bgInput = Color(0xFFF2F2F2);

  static const Color textPrimary = Color(0xFF1A1A1A);
  static const Color textSecondary = Color(0xFF6B6B6B);
  static const Color textDisabled = Color(0xFFB0B0B0);

  static const Color statusGreen = Color(0xFF22C55E);
  static const Color statusAmber = Color(0xFFF59E0B);
  static const Color statusGray = Color(0xFF9CA3AF);
  static const Color statusRed = Color(0xFFEF4444);

  static const Color borderSubtle = Color(0xFFEAEAEA);
}

class AppTheme {
  AppTheme._();

  static ThemeData theme() {
    final colorScheme = const ColorScheme.light(
      primary: AppColors.accent,
      onPrimary: Colors.white,
      primaryContainer: AppColors.accentDark,
      onPrimaryContainer: Colors.white,
      secondary: AppColors.accent,
      onSecondary: Colors.white,
      secondaryContainer: AppColors.accentDark,
      onSecondaryContainer: Colors.white,
      surface: AppColors.bgCard,
      onSurface: AppColors.textPrimary,
      onSurfaceVariant: AppColors.textSecondary,
      surfaceContainer: AppColors.bgBase,
      error: AppColors.statusRed,
      onError: Colors.white,
      outline: AppColors.borderSubtle,
      shadow: Colors.black,
    );

    final baseTextTheme = GoogleFonts.interTextTheme();

    const tabular = <FontFeature>[FontFeature.tabularFigures()];

    final textTheme = baseTextTheme.copyWith(
      displayLarge: GoogleFonts.inter(
        fontSize: 32,
        fontWeight: FontWeight.w800,
        color: AppColors.textPrimary,
        fontFeatures: tabular,
      ),
      headlineSmall: GoogleFonts.inter(
        fontSize: 22,
        fontWeight: FontWeight.w700,
        color: AppColors.textPrimary,
      ),
      titleMedium: GoogleFonts.inter(
        fontSize: 17,
        fontWeight: FontWeight.w600,
        color: AppColors.textPrimary,
      ),
      bodyMedium: GoogleFonts.inter(
        fontSize: 15,
        fontWeight: FontWeight.w400,
        color: AppColors.textPrimary,
      ),
      labelSmall: GoogleFonts.inter(
        fontSize: 13,
        fontWeight: FontWeight.w500,
        color: AppColors.textSecondary,
      ),
    );

    return ThemeData.light(useMaterial3: true).copyWith(
      colorScheme: colorScheme,
      scaffoldBackgroundColor: AppColors.bgBase,
      cardColor: AppColors.bgCard,
      dividerColor: AppColors.borderSubtle,
      textTheme: textTheme,
      appBarTheme: AppBarTheme(
        backgroundColor: AppColors.bgBase,
        foregroundColor: AppColors.textPrimary,
        elevation: 0,
        centerTitle: true,
        titleTextStyle: textTheme.titleMedium,
        surfaceTintColor: Colors.transparent,
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppColors.bgInput,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide.none,
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide.none,
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: AppColors.accent, width: 1.5),
        ),
        labelStyle: textTheme.bodyMedium?.copyWith(color: AppColors.textSecondary),
        hintStyle: textTheme.bodyMedium?.copyWith(color: AppColors.textDisabled),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.accent,
          foregroundColor: Colors.white,
          elevation: 0,
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
          ),
          textStyle: textTheme.labelSmall?.copyWith(
            color: Colors.white,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: AppColors.textSecondary,
          side: const BorderSide(color: AppColors.borderSubtle, width: 1.5),
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
          ),
          textStyle: textTheme.labelSmall?.copyWith(
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
      cardTheme: CardThemeData(
        color: AppColors.bgCard,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: const BorderSide(color: AppColors.borderSubtle, width: 1),
        ),
        margin: EdgeInsets.zero,
      ),
      bottomSheetTheme: const BottomSheetThemeData(
        backgroundColor: AppColors.bgCard,
        surfaceTintColor: Colors.transparent,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
      ),
      snackBarTheme: SnackBarThemeData(
        backgroundColor: AppColors.textPrimary,
        contentTextStyle: textTheme.bodyMedium?.copyWith(color: Colors.white),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  static TextStyle tabularTextStyle(TextStyle? style) {
    return style == null
        ? const TextStyle(fontFeatures: [FontFeature.tabularFigures()])
        : style.copyWith(
            fontFeatures: const [FontFeature.tabularFigures()],
          );
  }
}
