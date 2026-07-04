# Add project specific ProGuard rules here.
# Kotlinx.serialization needs its generated serializers kept.
-keepattributes *Annotation*, InnerClasses
-dontnote kotlinx.serialization.AnnotationsKt
-keepclassmembers class kotlinx.serialization.json.** {
    *** Companion;
}
-keepclasseswithmembers class kotlinx.serialization.json.** {
    kotlinx.serialization.KSerializer serializer(...);
}
-keep,includedescriptorclasses class com.mysplitwise.app.**$$serializer { *; }
-keepclassmembers class com.mysplitwise.app.** {
    *** Companion;
}
-keepclasseswithmembers class com.mysplitwise.app.** {
    kotlinx.serialization.KSerializer serializer(...);
}
