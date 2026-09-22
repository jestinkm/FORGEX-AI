@echo off
set "JAVA_HOME=C:\Program Files\Microsoft\jdk-21.0.12.101-hotspot"
set "PATH=%JAVA_HOME%\bin;%~dp0.tools\apache-maven-3.9.8\bin;%PATH%"
cd /d "%~dp0"
echo Starting TicketFlow Backend Server...
java -jar target\flash-sale-backend-1.0.0-SNAPSHOT.jar
pause
