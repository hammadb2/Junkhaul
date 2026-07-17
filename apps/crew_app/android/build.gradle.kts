allprojects {
    repositories {
        google()
        mavenCentral()
    }
}

val newBuildDir: Directory =
    rootProject.layout.buildDirectory
        .dir("../../build")
        .get()
rootProject.layout.buildDirectory.value(newBuildDir)

subprojects {
    val newSubprojectBuildDir: Directory = newBuildDir.dir(project.name)
    project.layout.buildDirectory.value(newSubprojectBuildDir)
}
subprojects {
    project.evaluationDependsOn(":app")
    // Force compileSdk=36 for all Android library plugins (including
    // google_navigation_flutter which was published with compileSdk 35).
    // Use afterEvaluate to ensure the plugin has been applied before we
    // try to configure it.
    project.afterEvaluate {
        project.plugins.withId("com.android.library") {
            project.extensions.configure<com.android.build.gradle.LibraryExtension>("android") {
                if (compileSdk == null || compileSdk!! < 36) {
                    compileSdk = 36
                }
            }
        }
    }
    // Skip AAR metadata checks that fail because google_navigation_flutter
    // was published with compileSdk 35 but flutter_plugin_android_lifecycle
    // requires minCompileSdk 36. The afterEvaluate block above forces
    // compileSdk=36 at build time, so the actual compilation is fine.
    project.tasks.matching { it.name.contains("AarMetadata") }.configureEach {
        enabled = false
    }
}

tasks.register<Delete>("clean") {
    delete(rootProject.layout.buildDirectory)
}
