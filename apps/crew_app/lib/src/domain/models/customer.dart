/// Customer information for a job.
class Customer {
  const Customer({
    required this.id,
    required this.name,
    required this.address,
    this.phone,
    this.lat,
    this.lng,
  });

  final String id;
  final String name;
  final String address;
  final String? phone;

  /// Destination latitude for navigation.
  final double? lat;

  /// Destination longitude for navigation.
  final double? lng;
}
