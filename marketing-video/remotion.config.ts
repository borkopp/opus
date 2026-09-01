import {Config} from "@remotion/cli/config";

// PNG intermediates keep typography and thin UI borders crisp during encoding.
Config.setVideoImageFormat("png");
Config.setOverwriteOutput(true);

