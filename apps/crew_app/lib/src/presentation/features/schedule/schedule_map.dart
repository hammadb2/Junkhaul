import 'package:flutter/material.dart';
import '../../../core/app_theme.dart';

/// Live Mapbox view showing the crew's truck position and numbered job
/// pins for the day's route.
///
/// TODO(dev): replace this placeholder with your Mapbox widget (e.g.
/// mapbox_maps_flutter's MapWidget), styled to match — light basemap,
/// truck marker at current GPS position, numbered pins per job in route
/// order. This file intentionally ships with no fake pin data.
class ScheduleMap extends StatelessWidget {
  const ScheduleMap({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      color: const Color(0xFFDCE4E0),
      child: const Center(
        child: Icon(Icons.map_outlined, size: 40, color: Color(0xFFB7C2BC)),
      ),
    );
  }
}
