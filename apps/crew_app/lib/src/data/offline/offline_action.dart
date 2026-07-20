/// One enqueued action that will be replayed when the network is back.
/// Stored in Hive as a JSON-encoded map so we don't need a generated adapter.
class OfflineAction {
  OfflineAction({
    required this.id,
    required this.type,
    required this.payload,
    this.idempotencyKey,
    this.filePaths,
    DateTime? createdAt,
    this.attempts = 0,
    this.serverConfirmed = false,
  }) : createdAt = createdAt ?? DateTime.now();

  final String id;

  /// Logical action type, e.g. 'clock_in', 'upload_photo', 'submit_signature'.
  final String type;

  /// JSON-encodable payload sent to the API.
  final Map<String, dynamic> payload;

  /// Idempotency key used by the server to deduplicate replays.
  final String? idempotencyKey;

  /// Optional local file paths to upload as multipart. Cleared after upload.
  final List<String>? filePaths;

  final DateTime createdAt;

  int attempts;

  /// True once the server has confirmed success and the action can be removed.
  bool serverConfirmed;

  Map<String, dynamic> toJson() => {
    'id': id,
    'type': type,
    'payload': payload,
    'idempotency_key': idempotencyKey,
    'file_paths': filePaths,
    'created_at': createdAt.toIso8601String(),
    'attempts': attempts,
    'server_confirmed': serverConfirmed,
  };

  factory OfflineAction.fromJson(Map<String, dynamic> json) => OfflineAction(
    id: json['id'] as String,
    type: json['type'] as String,
    payload: Map<String, dynamic>.from(json['payload'] as Map),
    idempotencyKey: json['idempotency_key'] as String?,
    filePaths: (json['file_paths'] as List?)?.cast<String>(),
    createdAt: DateTime.parse(json['created_at'] as String),
    attempts: (json['attempts'] as num?)?.toInt() ?? 0,
    serverConfirmed: json['server_confirmed'] as bool? ?? false,
  );
}
