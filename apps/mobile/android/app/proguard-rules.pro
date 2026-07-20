# Flutter embedding + plugin registrant are referenced reflectively.
-keep class io.flutter.** { *; }
-keep class io.flutter.plugins.** { *; }
-dontwarn io.flutter.embedding.**

# flutter_foreground_task starts its service by name from the manifest.
-keep class com.pravera.flutter_foreground_task.** { *; }

# Firebase / FCM model classes are instantiated reflectively from JSON.
-keep class com.google.firebase.** { *; }
-dontwarn com.google.firebase.**

# Play Core is referenced by the Flutter deferred-components path even when
# deferred components are unused; without this R8 fails on missing classes.
-dontwarn com.google.android.play.core.**

# local_auth biometric prompt callbacks.
-keep class androidx.biometric.** { *; }
