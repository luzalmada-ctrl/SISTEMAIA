@echo off
REM Compila el APK release del velocimetro.
REM Ajusta las rutas si instalas Flutter/Android SDK en otra ubicacion.

set "JAVA_HOME=C:\Program Files\ojdkbuild\java-17-openjdk-17.0.3.0.6-1"
set "ANDROID_HOME=C:\dev\android-sdk"
set "ANDROID_SDK_ROOT=C:\dev\android-sdk"
set "PATH=C:\dev\flutter\bin;%ANDROID_HOME%\platform-tools;%PATH%"

cd /d "%~dp0"
flutter build apk --release
pause
