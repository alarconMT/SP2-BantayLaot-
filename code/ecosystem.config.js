const dotenv = require('dotenv');
const path   = require('path');

function loadEnv(file) {
    const result = dotenv.config({ path: path.resolve(__dirname, file) });
    if (result.error) {
        throw new Error(`Missing env file: ${file}\nCopy the matching .example file and fill in real values.`);
    }
    return result.parsed;
}

module.exports = {
    apps: [
        {
            name:   'municipality-cdo',
            script: './municipality_server/index.js',
            env:    loadEnv('.env.cdo')
        },
        {
            name:   'municipality-opol',
            script: './municipality_server/index.js',
            env:    loadEnv('.env.opol')
        },
        {
            name:   'central-server',
            script: './central_server/central_index.js',
            env:    loadEnv('.env.central')
        }
    ]
};
