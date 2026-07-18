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
    // Use plugins.withId directly (not afterEvaluate) because
    // evaluationDependsOn(":app") above already evaluates subprojects,
    // making afterEvaluate fail with "project is already evaluated".
    // Forcing compileSdk=36 satisfies the AAR minCompileSdk=36 requirement
    // from flutter_plugin_android_lifecycle, so the AarMetadata check passes
    // normally — no need to disable it (disabling caused bundleDebugAar to
    // fail because the output directory was never created).
    project.plugins.withId("com.android.library") {
        project.extensions.configure<com.android.build.gradle.LibraryExtension>("android") {
            if (compileSdk == null || compileSdk!! < 36) {
                compileSdk = 36
            }
        }
    }
}

tasks.register<Delete>("clean") {
    delete(rootProject.layout.buildDirectory)
}
