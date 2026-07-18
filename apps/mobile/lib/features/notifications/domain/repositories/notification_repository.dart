import 'package:dartz/dartz.dart';

import '../../../../core/error/failures.dart';
import '../../data/models/notification_model.dart';

abstract class NotificationRepository {
  Future<Either<Failure, List<NotificationModel>>> list({bool unreadOnly});
  Future<Either<Failure, int>> unreadCount();
  Future<Either<Failure, void>> markRead(String id);
  Future<Either<Failure, void>> markAllRead();
}
