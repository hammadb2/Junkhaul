import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_flutter/hive_flutter.dart';

import 'src/app.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  Animate.defaultDuration = const Duration(milliseconds: 150);
  Animate.defaultCurve = Curves.easeOutCubic;

  await Hive.initFlutter();

  runApp(const ProviderScope(child: CrewApp()));
}
