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
}

// Force compileSdk=36 for all Android library plugins (including
// google_navigation_flutter which was published with compileSdk 35).
// Use pluginManager.withPlugin on each subproject — this fires during
// plugin application (before the Android extension is fully configured),
// so the compileSdk override is visible to the AarMetadata check.
// afterEvaluate fails because evaluationDependsOn already evaluates
// subprojects. plugins.withId in subprojects {} fires too late.
// projectsEvaluated fails with "It is too late to set compileSdk".
// pluginManager.withPlugin fires at the right time: after the plugin
// is applied but before its DSL is fully locked.
subprojects {
    pluginManager.withPlugin("com.android.library") {
        extensions.configure<com.android.build.gradle.LibraryExtension>("android") {
            if (compileSdk == null || compileSdk!! < 36) {
                compileSdk = 36
            }
        }
    }
}

tasks.register<Delete>("clean") {
    delete(rootProject.layout.buildDirectory)
}
