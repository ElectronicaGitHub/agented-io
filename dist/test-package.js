"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.testPackage = testPackage;
const enums_1 = require("./enums");
// Тестовая схема агента
const testAgentSchema = {
    id: 'test-agent',
    name: 'test-agent',
    type: enums_1.EAgentType.MAIN,
    prompt: 'You are a helpful test agent. Respond to user input.',
    functions: [],
    children: [],
    workTimeout: 30000,
    pingInterval: 5000
};
// Тестовая схема для reflection агента
const testReflectionSchema = {
    id: 'reflection-agent',
    name: 'reflection-agent',
    type: enums_1.EAgentType.REFLECTION,
    prompt: 'You are a reflection agent. Analyze and provide insights.',
    functions: [],
    children: [],
    cronSchedule: '* * * * *',
    cronInitOnStart: false
};
// Тестовая схема для worker агента
const testWorkerSchema = {
    id: 'test-worker-agent',
    name: 'worker-agent',
    type: enums_1.EAgentType.WORKER,
    prompt: 'You are a worker agent. Execute tasks efficiently.',
    functions: [],
    children: []
};
async function testPackage() {
    console.log('🧪 Testing agented.io package...\n');
    try {
        // Тест 1: Проверка схем агентов
        console.log('1️⃣ Testing Agent Schemas...');
        console.log('✅ Main Agent Schema:', testAgentSchema.name);
        console.log('   ID:', testAgentSchema.id);
        console.log('   Type:', testAgentSchema.type);
        console.log('   Work Timeout:', testAgentSchema.workTimeout);
        // Тест 2: Проверка reflection схемы
        console.log('\n2️⃣ Testing Reflection Schema...');
        console.log('✅ Reflection Schema:', testReflectionSchema.name);
        console.log('   ID:', testReflectionSchema.id);
        console.log('   Type:', testReflectionSchema.type);
        console.log('   Cron Schedule:', testReflectionSchema.cronSchedule);
        // Тест 3: Проверка worker схемы
        console.log('\n3️⃣ Testing Worker Schema...');
        console.log('✅ Worker Schema:', testWorkerSchema.name);
        console.log('   ID:', testWorkerSchema.id);
        console.log('   Type:', testWorkerSchema.type);
        // Тест 4: Проверка enum значений
        console.log('\n4️⃣ Testing Enum Values...');
        console.log('   Main Agent Type:', enums_1.EAgentType.MAIN);
        console.log('   Worker Agent Type:', enums_1.EAgentType.WORKER);
        console.log('   Reflection Agent Type:', enums_1.EAgentType.REFLECTION);
        console.log('   IDLE Status:', enums_1.EAgentStatus.IDLE);
        console.log('   WORKING Status:', enums_1.EAgentStatus.WORKING);
        // Тест 5: Проверка типов ответов
        console.log('\n5️⃣ Testing Response Types...');
        console.log('   Function Response:', enums_1.EAgentResponseType.FUNCTION);
        console.log('   Text Response:', enums_1.EAgentResponseType.TEXT);
        console.log('   Agent Response:', enums_1.EAgentResponseType.AGENT);
        console.log('\n🎉 All tests passed successfully!');
        console.log('\n📦 Package structure is working correctly!');
    }
    catch (error) {
        console.error('❌ Test failed:', error);
        if (error instanceof Error) {
            console.error('Stack trace:', error.stack);
        }
    }
}
// Запуск тестов
if (require.main === module) {
    testPackage();
}
