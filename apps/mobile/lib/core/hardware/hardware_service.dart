import 'package:geolocator/geolocator.dart';

abstract class HardwareService {
  Future<bool> authenticateUser(String reason);
  Future<Position> getCurrentLocation();
}
