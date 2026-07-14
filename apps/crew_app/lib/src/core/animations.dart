import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class JhAnimationDurations {
  JhAnimationDurations._();

  static const pageTransition = Duration(milliseconds: 250);
  static const stateTransition = Duration(milliseconds: 150);
  static const microInteraction = Duration(milliseconds: 100);
}

class JhAnimationCurves {
  JhAnimationCurves._();

  static const stateTransition = Curves.easeOutCubic;
  static const pageTransition = Curves.easeInOut;
}

CustomTransitionPage<T> pageFadeTransition<T>(
  BuildContext context,
  GoRouterState state,
  Widget child,
) {
  return CustomTransitionPage<T>(
    key: state.pageKey,
    child: child,
    transitionDuration: JhAnimationDurations.pageTransition,
    reverseTransitionDuration: JhAnimationDurations.pageTransition,
    transitionsBuilder: (context, animation, secondaryAnimation, child) {
      return FadeTransition(
        opacity: CurvedAnimation(
          parent: animation,
          curve: JhAnimationCurves.pageTransition,
        ),
        child: child,
      );
    },
  );
}

CustomTransitionPage<T> pageSharedAxisTransition<T>(
  BuildContext context,
  GoRouterState state,
  Widget child,
) {
  const begin = Offset(0.04, 0.0);
  const end = Offset.zero;
  const curve = JhAnimationCurves.pageTransition;

  return CustomTransitionPage<T>(
    key: state.pageKey,
    child: child,
    transitionDuration: JhAnimationDurations.pageTransition,
    reverseTransitionDuration: JhAnimationDurations.pageTransition,
    transitionsBuilder: (context, animation, secondaryAnimation, child) {
      final tween = Tween(begin: begin, end: end).chain(CurveTween(curve: curve));
      final fadeAnimation = CurvedAnimation(
        parent: animation,
        curve: const Interval(0, 0.8, curve: curve),
      );

      return SlideTransition(
        position: animation.drive(tween),
        child: FadeTransition(
          opacity: fadeAnimation,
          child: child,
        ),
      );
    },
  );
}

Animation<Color?> animateColor({
  required Animation<double> animation,
  required Color begin,
  required Color end,
  Curve curve = JhAnimationCurves.stateTransition,
}) {
  return ColorTween(begin: begin, end: end).animate(
    CurvedAnimation(parent: animation, curve: curve),
  );
}

Animation<EdgeInsets?> animateEdgeInsets({
  required Animation<double> animation,
  required EdgeInsets begin,
  required EdgeInsets end,
  Curve curve = JhAnimationCurves.stateTransition,
}) {
  return EdgeInsetsTween(begin: begin, end: end).animate(
    CurvedAnimation(parent: animation, curve: curve),
  );
}
