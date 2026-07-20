# Google Play Release — PingForce Mobile

Status of every Play submission blocker. Code items are done unless marked.

## Signing

Upload keystore lives **outside the repo** at:

```
C:/Users/rahee/.pingforce-keys/pingforce-upload.jks
alias: pingforce-upload
RSA 4096, valid until 2053-12-05
SHA256: 48:C3:0C:F4:F4:9B:CD:E8:31:BE:36:68:62:4B:C1:70:A5:B2:20:1E:9A:F7:2E:A5:59:AF:07:47:D2:36:60:50
```

Credentials are in `apps/mobile/android/key.properties` (gitignored).

> **BACK THIS UP NOW.** Copy the `.jks` and its password into a password
> manager or other secure store. If it is lost and Play App Signing is not
> enrolled, you can never publish an update to this app again — the listing
> has to be recreated under a new package name.

Enrol in **Play App Signing** at first upload so Google holds the real signing
key and a lost upload key is recoverable via support.

### CI signing

`.github/workflows/flutter_build.yml` reconstructs the keystore from secrets.
Add these repo secrets (Settings → Secrets and variables → Actions):

| Secret | Value |
| --- | --- |
| `ANDROID_KEYSTORE_BASE64` | `base64 -w0 pingforce-upload.jks` |
| `ANDROID_KEYSTORE_PASSWORD` | store password |
| `ANDROID_KEY_PASSWORD` | key password (same) |
| `ANDROID_KEY_ALIAS` | `pingforce-upload` |

Without them the workflow warns and falls back to debug signing; that AAB is
**not** uploadable.

## Code — done

- Release signing config reads `key.properties`, falls back to debug when absent
- R8 `minifyEnabled` + `shrinkResources` on, keep rules in `android/app/proguard-rules.pro`
- App label `mobile` → `PingForce`
- CI builds AAB (`flutter build appbundle`) as well as APK
- `versionCode` from `github.run_number`, so uploads are always monotonic
- Prominent disclosure dialog before the background-location request
  (`permissions_flow_screen.dart`) — required by Play policy
- `flutter_launcher_icons` wired for one-command icon regeneration

## Code — OPEN

### Launcher icon (blocker)

The current icon is the **stock Flutter logo**, on both Android and iOS. It
cannot ship: it is Flutter trademark, and Play rejects unmodified framework
logos as impersonation / low quality.

To fix, drop the master logo at:

```
apps/mobile/assets/branding/logo_1024.png            # 1024x1024, square, no alpha
apps/mobile/assets/branding/logo_foreground_1024.png # adaptive icon foreground, transparent, ~66% safe zone
```

then:

```bash
cd apps/mobile
flutter pub get
dart run flutter_launcher_icons
```

That regenerates all Android densities, the adaptive icon, iOS AppIcon, and web
icons. Also export a 512x512 PNG for the Play listing icon field.

### On-device verification (blocker)

Background tracking has never been run on a physical device. Before submitting,
confirm on real hardware:

- Location continues to record with the app backgrounded and screen off
- The foreground-service notification appears while checked in
- Tracking stops on check-out
- Declining "Allow all the time" leaves foreground check-in working

## Play Console — you must do these

- [ ] Create app entry, enrol in Play App Signing
- [ ] **Background location declaration** — the long pole. Requires a written
      justification plus a **demo video** showing the in-app disclosure and the
      feature working. Review often takes weeks; start it first.
- [ ] **Foreground service type declaration** — declare `location`, justify use
- [ ] **Data Safety form** — declare collection of: precise location
      (incl. background), biometric auth, camera/photos, personal identifiers.
      Must match the privacy policy.
- [ ] Privacy policy URL (already live — confirm it covers background location
      collection and retention explicitly, or the Data Safety form contradicts it)
- [ ] Store listing: short + full description, 512px icon, 1024x500 feature
      graphic, min 2 phone screenshots
- [ ] Content rating questionnaire
- [ ] Target audience / ads declaration
- [ ] Internal testing track first — do not go straight to production

## Build commands

```bash
cd apps/mobile
flutter build appbundle --release     # Play upload artifact -> build/app/outputs/bundle/release/
flutter build apk --release           # sideload / QA
```
