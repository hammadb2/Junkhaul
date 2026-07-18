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
// Use gradle.projectsEvaluated (not afterEvaluate or plugins.withId in
// subprojects) because evaluationDependsOn(":app") above causes subprojects
// to be evaluated before the subprojects {} block runs, making afterEvaluate
// fail with "project is already evaluated". plugins.withId fires too early
// and the compileSdk override doesn't take effect. projectsEvaluated runs
// after ALL projects are evaluated but before task execution, so the
// compileSdk change is visible to the AarMetadata check at execution time.
// This satisfies the minCompileSdk=36 requirement from
// flutter_plugin_android_lifecycle.
gradle.projectsEvaluated {
    subprojects.forEach { p ->
        p.plugins.withId("com.android.library") {
            p.extensions.configure<com.android.build.gradle.LibraryExtension>("android") {
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
