import { Config } from '@remotion/cli/config';

// JPEG frames are ~4x faster to encode than PNG and the film has no alpha.
Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(95);
Config.setOverwriteOutput(true);
Config.setCodec('h264');
Config.setCrf(16);
