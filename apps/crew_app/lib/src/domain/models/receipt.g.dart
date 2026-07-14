// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'receipt.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_Receipt _$ReceiptFromJson(Map<String, dynamic> json) => _Receipt(
  id: json['id'] as String,
  assignmentId: json['assignment_id'] as String?,
  receiptType: json['receipt_type'] as String?,
  vendor: json['vendor'] as String?,
  amountCad: (json['amount_cad'] as num?)?.toDouble(),
  receiptPhotoUrl: json['receipt_photo_url'] as String?,
  notes: json['notes'] as String?,
  createdAt: json['created_at'] as String?,
);

Map<String, dynamic> _$ReceiptToJson(_Receipt instance) => <String, dynamic>{
  'id': instance.id,
  'assignment_id': instance.assignmentId,
  'receipt_type': instance.receiptType,
  'vendor': instance.vendor,
  'amount_cad': instance.amountCad,
  'receipt_photo_url': instance.receiptPhotoUrl,
  'notes': instance.notes,
  'created_at': instance.createdAt,
};

_ReceiptsResponse _$ReceiptsResponseFromJson(Map<String, dynamic> json) =>
    _ReceiptsResponse(
      receipts:
          (json['receipts'] as List<dynamic>?)
              ?.map((e) => Receipt.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const <Receipt>[],
    );

Map<String, dynamic> _$ReceiptsResponseToJson(_ReceiptsResponse instance) =>
    <String, dynamic>{'receipts': instance.receipts};
