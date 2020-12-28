docker stop webviewer && docker rm webviewer
docker build -t webviewer .
docker run -itd -p 7776:3001 -p 3000:3000 -v $(pwd)/web:/var/webviwer/web -w /var/webviwer/web --name="webviewer" webviewer