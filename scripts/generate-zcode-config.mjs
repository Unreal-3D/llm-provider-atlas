#!/usr/bin/env node
/**
 * Generate a ZCode provider_config.json snippet from a provider's normalized
 * model catalog.
 *
 * Usage:
 *   node scripts/generate-zcode-config.mjs [providerId]
 *
 * Default providerId: tencent-token-plan
 * Output: targets/zcode/provider_config.example.json
 *
 * The output contains a placeholder API key. Never commit a real key.
 */

import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const providerId = process.argv[2] ?? 'tencent-token-plan';

const providerMapPath = path.join(root, 'targets', 'zcode', 'providers.json');
const providerMap = JSON.parse(fs.readFileSync(providerMapPath, 'utf8'));
const targetMeta = providerMap[providerId];

if (!targetMeta) {
  console.error(`Unknown provider "${providerId}". Add it to ${providerMapPath}.`);
  process.exit(1);
}

const modelsPath = path.join(root, 'providers', providerId, 'models.json');
if (!fs.existsSync(modelsPath)) {
  console.error(`Missing model catalog: ${modelsPath}`);
  process.exit(1);
}

const catalog = JSON.parse(fs.readFileSync(modelsPath, 'utf8'));
const selected = (catalog.models ?? [])
  .filter((model) => model.zcode?.selected)
  .sort((a, b) => (a.zcode.order ?? Number.MAX_SAFE_INTEGER) - (b.zcode.order ?? Number.MAX_SAFE_INTEGER));

if (selected.length === 0) {
  console.error(`No models selected for ${providerId}. Set zcode.selected = true in models.json.`);
  process.exit(1);
}

const capabilityNames = (model) =>
  new Set((model.capabilities ?? []).map((capability) => capability?.CapabilityName).filter(Boolean));

function toRule(model) {
  const zcode = model.zcode ?? {};
  if (!zcode.contextWindow || !zcode.maxOutputTokens) {
    throw new Error(`Missing zcode.contextWindow/maxOutputTokens for ${model.primaryModelId}`);
  }

  const capabilities = capabilityNames(model);

  return {
    modelId: model.primaryModelId,
    config: {
      enabled: true,
      properties: {
        contextWindow: zcode.contextWindow,
        supportsJsonSchemaOutput: false,
        supportsNativeWebSearch: false,
        supportsMidConversationSystem: false,
        inputFormat: {
          supportsImage: capabilities.has('InputImage'),
          supportsVideo: capabilities.has('InputVideo'),
          supportsPdf: false
        }
      },
      optionSpecs: {
        reasoningLevel: {
          values: zcode.reasoningLevels ?? ['enabled'],
          map: '{}'
        },
        maxOutputTokens: {
          max: zcode.maxOutputTokens
        }
      }
    },
    providerId
  };
}

const order = selected.map((model) => model.primaryModelId);
const rules = selected.map(toRule);

const config = {
  schemaVersion: 1,
  config: {
    providerConfigRules: {
      providerRules: [
        {
          providerId,
          providerName: targetMeta.providerName,
          enabled: true,
          config: {
            group: targetMeta.group,
            access: {
              type: 'api-key',
              apiKey: targetMeta.apiKeyPlaceholder
            },
            api: {
              type: targetMeta.apiType,
              baseUrl: targetMeta.baseUrl
            },
            personalModelIds: order,
            modelOrder: order,
            visibility: 'visible'
          }
        }
      ]
    },
    modelConfigRules: {
      providerModelRules: [],
      manualProviderModelRules: rules
    }
  }
};

const outputPath = path.join(root, 'targets', 'zcode', 'provider_config.example.json');
fs.writeFileSync(outputPath, JSON.stringify(config, null, 2) + '\n');

console.log(`Wrote ${path.relative(root, outputPath)}`);
console.log(`Provider: ${providerId}`);
console.log(`Models: ${order.length}`);
for (const model of selected) {
  console.log(`  ${model.zcode.order}. ${model.primaryModelId}`);
}
