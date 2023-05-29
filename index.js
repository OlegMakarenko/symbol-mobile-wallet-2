import { AppRegistry } from 'react-native';
import App from './src/App';
import { name as appName } from './app.json';
import { BackgroundService } from 'src/services/BackgroundService';
import BackgroundFetch from 'react-native-background-fetch';

// Override Node modules
if (!process.nextTick) {
    process = require('process');
}

if (!global.Buffer) {
    global.Buffer = require('buffer/').Buffer;
}

BackgroundService.start();
BackgroundFetch.registerHeadlessTask(BackgroundService.task);

// Register main component
AppRegistry.registerComponent(appName, () => App);
