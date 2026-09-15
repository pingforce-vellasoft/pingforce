import 'dart:convert';

import 'package:cryptography/cryptography.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

const _privateKeyStorageKey = 'attendance_ed25519_private_key_v1';
const _publicKeyStorageKey = 'attendance_ed25519_public_key_v1';

/// Persistent per-install Ed25519 key used to prove that a punch came from the
/// handset bound to the employee. Private key bytes never leave secure storage.
class DeviceSigningKey {
  DeviceSigningKey(this._storage);

  final FlutterSecureStorage _storage;
  final Ed25519 _algorithm = Ed25519();

  Future<SimpleKeyPairData> _keyPair() async {
    final storedPrivate = await _storage.read(key: _privateKeyStorageKey);
    final storedPublic = await _storage.read(key: _publicKeyStorageKey);
    if (storedPrivate != null && storedPublic != null) {
      return SimpleKeyPairData(
        base64Decode(storedPrivate),
        publicKey: SimplePublicKey(
          base64Decode(storedPublic),
          type: KeyPairType.ed25519,
        ),
        type: KeyPairType.ed25519,
      );
    }

    final generated = await _algorithm.newKeyPair();
    final privateBytes = await generated.extractPrivateKeyBytes();
    final publicKey = await generated.extractPublicKey();
    await _storage.write(
      key: _privateKeyStorageKey,
      value: base64Encode(privateBytes),
    );
    await _storage.write(
      key: _publicKeyStorageKey,
      value: base64Encode(publicKey.bytes),
    );
    return SimpleKeyPairData(
      privateBytes,
      publicKey: publicKey,
      type: KeyPairType.ed25519,
    );
  }

  Future<String> publicKey() async {
    final key = await (await _keyPair()).extractPublicKey();
    return 'ed25519:${base64Encode(key.bytes)}';
  }

  static String canonicalPunch({
    required String deviceId,
    required DateTime timestamp,
    required double latitude,
    required double longitude,
    required double accuracy,
    required bool isMockLocation,
    required bool biometricVerified,
    String clientRef = '',
  }) => [
    'pingforce-attendance-v1',
    deviceId,
    timestamp.toUtc().toIso8601String(),
    latitude.toStringAsFixed(7),
    longitude.toStringAsFixed(7),
    accuracy.toStringAsFixed(2),
    isMockLocation ? '1' : '0',
    biometricVerified ? '1' : '0',
    clientRef,
  ].join('\n');

  Future<String> signPunch({
    required String deviceId,
    required DateTime timestamp,
    required double latitude,
    required double longitude,
    required double accuracy,
    required bool isMockLocation,
    required bool biometricVerified,
    String clientRef = '',
  }) async {
    final signature = await _algorithm.sign(
      utf8.encode(
        canonicalPunch(
          deviceId: deviceId,
          timestamp: timestamp,
          latitude: latitude,
          longitude: longitude,
          accuracy: accuracy,
          isMockLocation: isMockLocation,
          biometricVerified: biometricVerified,
          clientRef: clientRef,
        ),
      ),
      keyPair: await _keyPair(),
    );
    return base64Encode(signature.bytes);
  }
}
