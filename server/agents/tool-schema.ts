export const SCENE_TOOL_DEFINITIONS = Object.freeze([
  {
    type: 'function',
    function: {
      name: 'find_equipment',
      description: '按名称、位号、工艺段或区域查询汽车制造设备。',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string' },
          area: { type: 'string' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'select_equipment',
      description: '在三维场景中选择一台或多台设备。',
      parameters: {
        type: 'object',
        required: ['selectionIds'],
        properties: {
          selectionIds: {
            type: 'array',
            minItems: 1,
            items: { type: 'string' },
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'focus_equipment',
      description: '选择设备并将相机平滑移动到该设备。',
      parameters: {
        type: 'object',
        required: ['selectionId'],
        properties: {
          selectionId: { type: 'string' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'highlight_equipment',
      description: '临时高亮一台或多台设备。',
      parameters: {
        type: 'object',
        required: ['selectionIds'],
        properties: {
          selectionIds: {
            type: 'array',
            minItems: 1,
            items: { type: 'string' },
          },
          durationMs: { type: 'number', minimum: 0 },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'set_camera_view',
      description: '切换全厂、区域、设备或俯视视角。',
      parameters: {
        type: 'object',
        required: ['view'],
        properties: {
          view: {
            type: 'string',
            enum: ['overview', 'area', 'equipment', 'top'],
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'clear_scene_focus',
      description: '清除选择和高亮，并返回全厂视角。',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'play_production',
      description: '播放从原材料进入到整车驶出成品物流月台的完整生产流动画。',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
] as const);
