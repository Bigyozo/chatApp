#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */

/**
 * 列出 AWS Bedrock 可用模型的脚本
 * 运行方法: node scripts/list-bedrock-models.js
 */

const { BedrockClient, ListFoundationModelsCommand } = require('@aws-sdk/client-bedrock');

// 加载环境变量
require('dotenv').config({ path: '.env.local' });

const client = new BedrockClient({
    region: process.env.AWS_REGION || 'ap-northeast-1',
    credentials: process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    } : undefined,
});

async function listModels() {
    console.log('='.repeat(80));
    console.log('AWS Bedrock 可用模型列表');
    console.log('='.repeat(80));
    console.log('区域:', process.env.AWS_REGION || 'ap-northeast-1');
    console.log('='.repeat(80));
    console.log('');

    try {
        const command = new ListFoundationModelsCommand({});
        const response = await client.send(command);

        if (!response.modelSummaries || response.modelSummaries.length === 0) {
            console.log('❌ 未找到可用模型');
            console.log('\n可能的原因:');
            console.log('1. 该区域不支持 Bedrock 服务');
            console.log('2. AWS 凭证没有 Bedrock 权限');
            console.log('3. 需要在 Bedrock 控制台启用模型访问');
            return;
        }

        console.log(`找到 ${response.modelSummaries.length} 个模型\n`);

        // 按提供商分组
        const modelsByProvider = {};

        for (const model of response.modelSummaries) {
            const provider = model.providerName || 'Unknown';
            if (!modelsByProvider[provider]) {
                modelsByProvider[provider] = [];
            }
            modelsByProvider[provider].push(model);
        }

        // 显示分组后的模型
        for (const [provider, models] of Object.entries(modelsByProvider)) {
            console.log(`\n📦 ${provider} (${models.length} 个模型)`);
            console.log('-'.repeat(80));

            for (const model of models) {
                console.log(`\n  模型 ID: ${model.modelId}`);
                console.log(`  模型名称: ${model.modelName || 'N/A'}`);

                if (model.inputModalities && model.inputModalities.length > 0) {
                    console.log(`  输入类型: ${model.inputModalities.join(', ')}`);
                }

                if (model.outputModalities && model.outputModalities.length > 0) {
                    console.log(`  输出类型: ${model.outputModalities.join(', ')}`);
                }

                if (model.responseStreamingSupported) {
                    console.log(`  流式响应: ✅ 支持`);
                }
            }
        }

        console.log('\n' + '='.repeat(80));
        console.log('💡 使用建议:');
        console.log('='.repeat(80));
        console.log('1. 选择一个支持流式响应的模型');
        console.log('2. 复制模型 ID');
        console.log('3. 在 .env.local 中设置: BEDROCK_MODEL_ID=<模型ID>');
        console.log('4. 或直接修改 src/app/api/model/gemma/route.ts 中的 GEMMA_MODEL_ID');
        console.log('');

        // 推荐的模型
        const streamingModels = response.modelSummaries.filter(m => m.responseStreamingSupported);
        if (streamingModels.length > 0) {
            console.log('\n推荐使用以下支持流式响应的模型:');
            console.log('-'.repeat(80));
            streamingModels.slice(0, 5).forEach(model => {
                console.log(`  ✓ ${model.modelId} (${model.providerName})`);
            });
        }

    } catch (error) {
        console.error('\n❌ 错误:', error.message);

        if (error.name === 'AccessDeniedException') {
            console.log('\n权限不足。请确保 AWS 凭证具有以下权限:');
            console.log('  - bedrock:ListFoundationModels');
            console.log('  - bedrock:InvokeModel');
            console.log('  - bedrock:InvokeModelWithResponseStream');
        } else if (error.name === 'UnrecognizedClientException') {
            console.log('\nAWS 凭证无效。请检查 .env.local 中的:');
            console.log('  - AWS_ACCESS_KEY_ID');
            console.log('  - AWS_SECRET_ACCESS_KEY');
        }
    }

    console.log('\n' + '='.repeat(80));
}

listModels();
