import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(95);
Config.setCodec("h264");
Config.setCrf(16);
// Port 3000 is usually taken by the app's dev server.
Config.setStudioPort(3300);
Config.setChromiumOpenGlRenderer("angle");
