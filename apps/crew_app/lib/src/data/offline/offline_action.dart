/// One enqueued action that will be replayed when the network is back.
/// Stored in Hive as a JSON-encoded map so we don't need a generated adapter.
class OfflineAction {
  OfflineAction({
    required this.id,
    required this.type,
    required this.payload,
    this.filePaths,
    DateTime? createdAt,
    this.attempts = 0,
  }) : createdAt = createdAt ?? DateTime.now();

  final String id;

  /// Logical action type, e.g. 'clock_in', 'upload_photo', 'submit_signature'.
  final String type;

  /// JSON-encodable payload sent to the API.
  final Map<String, dynamic> payload;

  /// Optional local file paths to upload as multipart. Cleared after upload.
  final List<String>? filePaths;

  final DateTime createdAt;

  int attempts;

  Map<String, dynamic> toJson() => {
    'id': id,
    'type': type,
    'payload': payload,
    'file_paths': filePaths,
    'created_at': createdAt.toIso8601String(),
    'attempts': attempts,
  };

  factory OfflineAction.fromJson(Map<String, dynamic> json) => OfflineAction(
    id: json['id'] as String,
    type: json['type'] as String,
    payload: Map<String, dynamic>.from(json['payload'] as Map),
    filePaths: (json['file_paths'] as List?)?.cast<String>(),
    createdAt: DateTime.parse(json['created_at'] as String),
    attempts: (json['attempts'] as num?)?.toInt() ?? 0,
  );
}
