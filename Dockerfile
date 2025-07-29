# Use a lightweight web server
FROM nginx:alpine

# Copy our static files to the web server's directory
COPY *.html /usr/share/nginx/html/
COPY *.js /usr/share/nginx/html/

# Expose port 8080 to match the K8s configuration
EXPOSE 8080

# Configure Nginx to listen on port 8080 instead of the default 80
RUN sed -i 's/listen\s*80;/listen 8080;/g' /etc/nginx/conf.d/default.conf