import java.util.Properties
import java.io.FileInputStream

plugins {
    id("com.android.application")
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin")
}

android {
    namespace = "ca.junkhaul.crew_app"
    compileSdk = 36

    compileOptions {
        isCoreLibraryDesugaringEnabled = true
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    defaultConfig {
        applicationId = "ca.junkhaul.crew_app"
        minSdk = 24
        targetSdk = flutter.targetSdkVersion
        versionCode = flutter.versionCode
        versionName = flutter.versionName
        multiDexEnabled = true
        // Google Maps API key — passed via -P or env var, defaults to empty.
        manifestPlaceholders["GOOGLE_MAPS_API_KEY"] =
            project.findProperty("GOOGLE_MAPS_API_KEY") as String? ?: ""
    }

    val keystoreProperties = Properties()
    val keystorePropertiesFile = rootProject.file("key.properties")
    val hasKeystore = keystorePropertiesFile.exists()
    if (hasKeystore) {
        keystoreProperties.load(FileInputStream(keystorePropertiesFile))
    }

    signingConfigs {
        if (hasKeystore) {
            create("release") {
                keyAlias = keystoreProperties["keyAlias"] as String
                keyPassword = keystoreProperties["keyPassword"] as String
                storeFile = keystoreProperties["storeFile"]?.let { file(it as String) }
                storePassword = keystoreProperties["storePassword"] as String
            }
        }
    }

    buildTypes {
        release {
            if (hasKeystore) {
                signingConfig = signingConfigs.getByName("release")
            }
            // ProGuard rules for release minification (R8).
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }
}

// The Google Navigation SDK (navigation:7.7.0) already bundles the Google
// Maps SDK classes (com.google.android.gms.maps.*). When google_maps_flutter
// is also used, play-services-maps is pulled in transitively, causing
// duplicate class errors. Exclude play-services-maps from all configurations
// so only the Navigation SDK's bundled copy is used.
// See: https://developers.google.com/maps/documentation/navigation/android-sdk/android-studio-setup
configurations.all {
    exclude(group = "com.google.android.gms", module = "play-services-maps")
}

kotlin {
    compilerOptions {
        jvmTarget = org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17
    }
}

flutter {
    source = "../.."
}

dependencies {
    // Google Navigation SDK (navigation:7.7.0) requires the NIO desugaring
    // flavor and desugar_jdk_libs >= 2.1.5. See:
    // https://d.android.com/r/tools/api-desugaring-flavors
    coreLibraryDesugaring("com.android.tools:desugar_jdk_libs_nio:2.1.5")
}
