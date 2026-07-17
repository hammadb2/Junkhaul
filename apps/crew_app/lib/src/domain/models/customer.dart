/// TODO(dev): replace with your existing customer model if one already exists.
class Customer {
  const Customer({
    required this.id,
    required this.name,
    required this.address,
    this.phone,
  });

  final String id;
  final String name;
  final String address;
  final String? phone;
}
