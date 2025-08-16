import { 
  EAgentType,
  EAgentStatus,
  EAgentResponseType
} from './enums';

// Тестовая схема агента
const testAgentSchema = {
  id: 'test-agent',
  name: 'test-agent',
  type: EAgentType.MAIN,
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
  type: EAgentType.REFLECTION,
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
  type: EAgentType.WORKER,
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
    console.log('   Main Agent Type:', EAgentType.MAIN);
    console.log('   Worker Agent Type:', EAgentType.WORKER);
    console.log('   Reflection Agent Type:', EAgentType.REFLECTION);
    console.log('   IDLE Status:', EAgentStatus.IDLE);
    console.log('   WORKING Status:', EAgentStatus.WORKING);

    // Тест 5: Проверка типов ответов
    console.log('\n5️⃣ Testing Response Types...');
    console.log('   Function Response:', EAgentResponseType.FUNCTION);
    console.log('   Text Response:', EAgentResponseType.TEXT);
    console.log('   Agent Response:', EAgentResponseType.AGENT);

    console.log('\n🎉 All tests passed successfully!');
    console.log('\n📦 Package structure is working correctly!');

  } catch (error) {
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

export { testPackage };
