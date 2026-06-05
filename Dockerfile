FROM eclipse-temurin:21-jre
WORKDIR /app
COPY target/secretary-0.0.1-SNAPSHOT.jar app.jar
EXPOSE 8080 8443
ENTRYPOINT ["java", "-jar", "app.jar"]
