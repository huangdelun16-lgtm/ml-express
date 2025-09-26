# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.

# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# ================================
# Myanmar Express ProGuard Rules
# ================================

# Keep application class
-keep class com.myanmarexpress.app.MyanmarExpressApplication { *; }

# ================================
# Retrofit and OkHttp
# ================================
-keepattributes Signature, InnerClasses, EnclosingMethod
-keepattributes RuntimeVisibleAnnotations, RuntimeVisibleParameterAnnotations
-keepattributes AnnotationDefault

-keepclassmembers,allowshrinking,allowobfuscation interface * {
    @retrofit2.http.* <methods>;
}

-dontwarn okhttp3.internal.platform.**
-dontwarn org.conscrypt.**
-dontwarn org.bouncycastle.**
-dontwarn org.openjsse.**

# OkHttp platform used only on JVM and when Conscrypt and other security providers are available.
-dontwarn okhttp3.internal.platform.ConscryptPlatform
-dontwarn okhttp3.internal.platform.BouncyCastlePlatform
-dontwarn okhttp3.internal.platform.OpenJSSEPlatform

# ================================
# Gson
# ================================
-keepattributes Signature
-keepattributes *Annotation*
-dontwarn sun.misc.**

# Keep generic signature of Call, Response (R8 full mode strips signatures from non-kept items).
-keep,allowobfuscation,allowshrinking interface retrofit2.Call
-keep,allowobfuscation,allowshrinking class retrofit2.Response

# With R8 full mode generic signatures are stripped for classes that are not kept.
-keep,allowobfuscation,allowshrinking class kotlin.coroutines.Continuation

# Gson specific classes
-keep class com.google.gson.** { *; }
-keep class * implements com.google.gson.TypeAdapter
-keep class * implements com.google.gson.TypeAdapterFactory
-keep class * implements com.google.gson.JsonSerializer
-keep class * implements com.google.gson.JsonDeserializer

# Keep data classes used with Gson
-keep class com.myanmarexpress.**.data.model.** { *; }
-keep class com.myanmarexpress.**.data.remote.dto.** { *; }

# ================================
# Room Database
# ================================
-keep class androidx.room.** { *; }
-keep class androidx.sqlite.** { *; }
-dontwarn androidx.room.paging.**

# Keep Room entities and DAOs
-keep class com.myanmarexpress.**.data.local.entity.** { *; }
-keep class com.myanmarexpress.**.data.local.dao.** { *; }

# ================================
# Hilt
# ================================
-keep class dagger.hilt.** { *; }
-keep class javax.inject.** { *; }
-keep class * extends dagger.hilt.android.lifecycle.HiltViewModel { *; }

# Keep Hilt generated classes
-keep class **_HiltModules { *; }
-keep class **_HiltComponents { *; }
-keep class **_Factory { *; }
-keep class **_MembersInjector { *; }

# ================================
# Firebase
# ================================
-keep class com.google.firebase.** { *; }
-keep class com.google.android.gms.** { *; }
-dontwarn com.google.firebase.**
-dontwarn com.google.android.gms.**

# Firebase Messaging
-keep class com.google.firebase.messaging.** { *; }
-keep class com.myanmarexpress.**.data.service.**FirebaseMessagingService { *; }

# ================================
# Google Maps
# ================================
-keep class com.google.android.gms.maps.** { *; }
-keep interface com.google.android.gms.maps.** { *; }
-dontwarn com.google.android.gms.maps.**

# ================================
# Socket.IO
# ================================
-keep class io.socket.** { *; }
-keep class org.java_websocket.** { *; }
-dontwarn io.socket.**
-dontwarn org.java_websocket.**

# ================================
# Coroutines
# ================================
-keepnames class kotlinx.coroutines.internal.MainDispatcherFactory {}
-keepnames class kotlinx.coroutines.CoroutineExceptionHandler {}
-keepclassmembers class kotlinx.coroutines.** {
    volatile <fields>;
}

# ================================
# Parcelize
# ================================
-keep interface android.os.Parcelable
-keep class * implements android.os.Parcelable {
    public static final android.os.Parcelable$Creator *;
}
-keep class kotlin.Metadata { *; }

# ================================
# Enum classes
# ================================
-keepclassmembers enum * {
    public static **[] values();
    public static ** valueOf(java.lang.String);
}

# ================================
# Keep BuildConfig
# ================================
-keep class com.myanmarexpress.**.BuildConfig { *; }

# ================================
# Coil Image Loading
# ================================
-keep class coil.** { *; }
-dontwarn coil.**

# ================================
# Biometric
# ================================
-keep class androidx.biometric.** { *; }

# ================================
# Security Crypto
# ================================
-keep class androidx.security.crypto.** { *; }

# ================================
# Custom Application Classes
# ================================
-keep class com.myanmarexpress.**.presentation.** { *; }
-keep class com.myanmarexpress.**.domain.** { *; }

# Keep ViewModels
-keep class * extends androidx.lifecycle.ViewModel { *; }

# Keep Repository classes
-keep class com.myanmarexpress.**.repository.** { *; }

# ================================
# Remove Logging in Release
# ================================
-assumenosideeffects class android.util.Log {
    public static boolean isLoggable(java.lang.String, int);
    public static int v(...);
    public static int i(...);
    public static int w(...);
    public static int d(...);
    public static int e(...);
}

# ================================
# Optimization
# ================================
-optimizationpasses 5
-allowaccessmodification
-dontpreverify

# ================================
# Keep line numbers for debugging
# ================================
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile
