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
//
// Timing problem: evaluationDependsOn(":app") causes subprojects to be
// evaluated before the subprojects {} block runs, so afterEvaluate,
// plugins.withId, and pluginManager.withPlugin all fire too late.
// projectsEvaluated fails with "It is too late to set compileSdk".
//
// Solution: use gradle.beforeProject to register an afterEvaluate callback
// BEFORE the project is evaluated. The callback runs after the plugin's
// build.gradle sets compileSdk=35, overriding it to 36 before the Android
// plugin's own afterEvaluate callback configures tasks (which is when
// compileSdk is read and locked).
gradle.beforeProject {
    afterEvaluate {
        if (pluginManager.hasPlugin("com.android.library")) {
            extensions.configure<com.android.build.gradle.LibraryExtension>("android") {
                if (compileSdk == null || compileSdk!! < 36) {
                    compileSdk = 36
                }
            }
        }
    }
}

tasks.register<Delete>("clean") {
    delete(rootProject.layout.buildDirectory)
}
