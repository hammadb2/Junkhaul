# Google ML Kit - text recognition
# The Korean text recognizer class is referenced but may not be present
# in all ML Kit distributions. R8 fails with "Missing class" during
# release minification. Suppress the error.
-dontwarn com.google.mlkit.vision.text.korean.KoreanTextRecognizerOptions
