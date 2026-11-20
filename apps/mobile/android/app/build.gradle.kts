import java.util.Properties
import java.io.FileInputStream
import java.util.Base64

plugins {
    id("com.android.application")
    id("kotlin-android")
    // Google services plugin reads google-services.json for Firebase (FCM)
    id("com.google.gms.google-services")
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin")
}

// Release signing credentials live in android/key.properties, which is gitignored
// and points at a keystore stored outside the repo. Absent on CI forks and fresh
// clones, in which case release builds fall back to debug signing so local
// `flutter run --release` still works.
val keystoreProperties = Properties()
val keystorePropertiesFile = rootProject.file("key.properties")
val hasReleaseSigning = keystorePropertiesFile.exists()
// Flutter forwards --dart-define values to Gradle as base64-encoded entries.
val isQaBuild = (project.findProperty("dart-defines") as? String)
    ?.split(",")
    ?.map { String(Base64.getDecoder().decode(it)) }
    ?.contains("PINGFORCE_ENV=qa") == true
if (hasReleaseSigning) {
    keystoreProperties.load(FileInputStream(keystorePropertiesFile))
}

android {
    namespace = "com.vellasoft.pingforce"
    compileSdk = flutter.compileSdkVersion
    ndkVersion = flutter.ndkVersion

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = JavaVersion.VERSION_17.toString()
    }

    defaultConfig {
        // Must match the Firebase Android app registration (pingforce-db47a)
        applicationId = if (isQaBuild) "com.vellasoft.pingforce.qa" else "com.vellasoft.pingforce"
        manifestPlaceholders["appLabel"] = if (isQaBuild) "PingForce QA" else "PingForce"
        manifestPlaceholders["qaCleartext"] = if (isQaBuild) "true" else "false"
        // You can update the following values to match your application needs.
        // For more information, see: https://flutter.dev/to/review-gradle-config.
        minSdk = flutter.minSdkVersion
        targetSdk = flutter.targetSdkVersion
        versionCode = flutter.versionCode
        versionName = flutter.versionName
    }

    signingConfigs {
        if (hasReleaseSigning) {
            create("release") {
                keyAlias = keystoreProperties["keyAlias"] as String
                keyPassword = keystoreProperties["keyPassword"] as String
                storeFile = file(keystoreProperties["storeFile"] as String)
                storePassword = keystoreProperties["storePassword"] as String
            }
        }
    }

    buildTypes {
        release {
            signingConfig = if (hasReleaseSigning) {
                signingConfigs.getByName("release")
            } else {
                signingConfigs.getByName("debug")
            }
            // R8 shrink + obfuscate. Keep rules in proguard-rules.pro cover the
            // reflection-based plugins (Firebase, flutter_foreground_task).
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }
}

flutter {
    source = "../.."
}

// Never generate production Firebase resources for the separate QA package.
tasks.configureEach {
    if (isQaBuild && name.endsWith("GoogleServices")) enabled = false
}
