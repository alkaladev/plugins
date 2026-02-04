const assert = require("node:assert");

// Mock data.json
require.cache[require.resolve('./data.json')] = {
    exports: [
        { country_code: 'us', flag_emoji: '🇺🇸', languages: ['English'] },
        { country_code: 'fr', flag_emoji: '🇫🇷', languages: ['French'] },
    ]
};

const { isValidCode, isValidEmoji, getLanguagesFromCode, getLanguagesFromEmoji } = require('./index');

// Test isValidCode
function testIsValidCode() {
    assert.strictEqual(isValidCode('us'), true, 'isValidCode should return true for a valid country code');
    assert.strictEqual(isValidCode('xyz'), false, 'isValidCode should return false for an invalid country code');
}

// Test isValidEmoji
function testIsValidEmoji() {
    assert.strictEqual(isValidEmoji('🇺🇸'), true, 'isValidEmoji should return true for a valid country emoji');
    assert.strictEqual(isValidEmoji('🏴‍☠️'), false, 'isValidEmoji should return false for an invalid country emoji');
}

// Test getLanguagesFromCode
function testGetLanguagesFromCode() {
    assert.deepStrictEqual(getLanguagesFromCode('us'), ['English'], 'getLanguagesFromCode should return languages for a valid country code');
    assert.deepStrictEqual(getLanguagesFromCode('xyz'), [], 'getLanguagesFromCode should return an empty array for an invalid country code');
    assert.throws(() => getLanguagesFromCode(), /Country Code is required/, 'getLanguagesFromCode should throw an error if no country code is provided');
}

// Test getLanguagesFromEmoji
function testGetLanguagesFromEmoji() {
    assert.deepStrictEqual(getLanguagesFromEmoji('🇺🇸'), ['English'], 'getLanguagesFromEmoji should return languages for a valid country emoji');
    assert.deepStrictEqual(getLanguagesFromEmoji('🏴‍☠️'), [], 'getLanguagesFromEmoji should return an empty array for an invalid country emoji');
    assert.throws(() => getLanguagesFromEmoji(), /Emoji is required/, 'getLanguagesFromEmoji should throw an error if no emoji is provided');
}

// Run tests
testIsValidCode();
testIsValidEmoji();
testGetLanguagesFromCode();
testGetLanguagesFromEmoji();

console.log('All tests passed!');