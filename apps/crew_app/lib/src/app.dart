import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'core/app_theme.dart';
import 'router/router.dart';

class CrewApp extends ConsumerWidget {
  const CrewApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return MaterialApp.router(
      title: 'Junkhaul Crew',
      theme: AppTheme.theme(),
      themeMode: ThemeMode.light,
      darkTheme: ThemeData.light(),
      routerConfig: ref.watch(routerProvider),
      debugShowCheckedModeBanner: false,
    );
  }
}
