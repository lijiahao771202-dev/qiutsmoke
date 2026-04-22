import { TTSCard } from "@/lib/hooks/useData";
import { VOICES } from "@/lib/constants";

export const EMOTION_BODY_SCAN_CARDS: TTSCard[] = [
    {
        id: "emotion-body-v1",
        title: "🧘‍♀️ 基础身体扫描（10分钟极度深层放松）",
        content: `找一个安静的地方，平躺下来。双腿自然分开，双手放在身体两侧，掌心朝上。闭上眼睛。[pause 8s]
现在，我们要进行一次深度的身体扫描。在这个过程中，你不需要去“做”任何事情，也不需要努力去“放松”。你只需要去“感觉”。[pause 10s]

首先，深吸一口气，让清凉的空气填满你的腹部……缓慢地呼气，把所有的控制权都交给地心引力。[pause 15s]

把你的注意力，像一个温柔的聚光灯一样，带到你的右脚脚趾上。[pause 8s]
去感觉它们。大脚趾、二脚趾……一直到小脚趾。去体会它们与袜子、或者与空气接触的温度。[pause 10s]
让这束光移动到你的右脚脚底。感受脚后跟陷入床垫的重量。
继续向上，右脚脚踝、右小腿、右侧的膝盖……[pause 15s]
如果有任何紧张或者酸痛，不要去评价它，只是看着它。让注意力流过你的右大腿，来到右侧的骨盆。[pause 15s]

现在，把聚光灯转移到你的左脚脚趾。[pause 8s]
感受左脚脚底、脚后跟。
缓慢向上移动……左侧脚踝、左小腿、左膝盖。[pause 10s]
感受肌肉的轮廓，感受血液在血管里微弱的脉动。继续向上，左大腿、左侧骨盆。[pause 15s]

把注意力带到你的整个下半身。体会两条腿完完全全失去力量，像两根沉重的原木一样，深深地陷在垫子里。[pause 20s]

现在，让这束光来到你的下背部。这是我们平时积累了最多压力的地方。[pause 10s]
感受脊椎一节一节地与地面贴合。感受你的胃部和腹部，随着呼吸在极其缓慢地起伏。[pause 15s]
把注意力向上移动，来到你的胸腔。感受心脏的跳动。感受胸腔的扩张和收缩。[pause 15s]

让光束来到你的双手。右手的指尖、掌心、手腕、小臂、手肘、大臂、右侧肩膀。[pause 15s]
左手的指尖、掌心、手腕、小臂、手肘、大臂、左侧肩膀。[pause 15s]
体会双臂彻底放松后那种沉甸甸的、毫无防备的下坠感。[pause 20s]

最后，把注意力带到你的脖颈、你的下巴。[pause 8s]
微微张开嘴唇，让你的牙齿分开。放松你的舌头，让它自然地沉在口腔底部。[pause 10s]
放松你的脸颊、你的眼皮、你的眉心。把紧皱的眉头完全抚平。[pause 10s]
放松你的整个头皮。[pause 15s]

现在，让你的觉知扩展到你的全身。从头顶到脚趾，你是一个完整、连贯、且绝对平静的整体。[pause 20s]
没有任何地方需要你去紧绷，没有任何事情需要你去处理。你就像沉在最安静的海底。[pause 20s]

深深地吸一口气……缓慢地呼气。当你想睁开眼睛时，慢慢地活动一下手指和脚趾，把这份宁静带回你的生活里。[pause 10s]`,
        voice_id: VOICES[0]?.id || "zh-CN-XiaoxiaoNeural",
        rate: "10%",
        guidance_level: "light",
        created_at: new Date().toISOString()
    },
    {
        id: "emotion-body-v2",
        title: "⚡ 1分钟紧急重置（冰水浇头法）",
        content: `闭上眼睛。深吸气。想象一桶冰水从你的头顶浇下。[pause 5s]
去感受这股冰凉的觉知，瞬间从头皮滑落，掠过你的眉心、紧绷的下巴。[pause 5s]
顺着后颈，直接冲刷掉肩膀上所有的重量。[pause 8s]
跟着这股水流，把注意力一口气沉入脚底。感受双脚踩在地板上的极度坚实。
呼气。你已经回到了现在。睁开眼。[pause 3s]`,
        voice_id: VOICES[0]?.id || "zh-CN-XiaoxiaoNeural",
        rate: "10%",
        guidance_level: "heavy",
        created_at: new Date().toISOString()
    },
    {
        id: "emotion-body-v3",
        title: "⚡ 2分钟局部释压（拯救肩颈僵硬）",
        content: `闭上眼。把全部的注意力集中在你的后颈和肩膀。[pause 5s]
感受那里像石头一样的坚硬。现在，用力耸起肩膀，靠近耳朵，让肌肉紧绷到极点！[pause 5s]
突然松开！[pause 8s]
感受那种瞬间卸下千斤重担的温热感，像有一股暖流顺着后背流下。[pause 10s]
微微转动脖子。每一次呼吸，都让肩膀再下沉一厘米。让它们彻底垮下来。[pause 10s]`,
        voice_id: VOICES[0]?.id || "zh-CN-XiaoxiaoNeural",
        rate: "10%",
        guidance_level: "heavy",
        created_at: new Date().toISOString()
    },
    {
        id: "emotion-body-v4",
        title: "⚡ 3分钟快速下切（瀑布式抗恐慌）",
        content: `恐慌来袭时，你的能量全都堵在头顶。现在，跟着我往下切。[pause 5s]
注意力离开头颅，来到胸口。感受心脏的跳动。[pause 8s]
继续向下，来到腹部。深吸气，让肚子像气球一样鼓起，呼气瘪下。[pause 10s]
继续猛烈向下，来到双腿、脚踝，最后死死钉在你的脚底板上！[pause 10s]
感受大地的引力。你的根扎得很深，上面的风暴吹不倒你。[pause 15s]`,
        voice_id: VOICES[0]?.id || "zh-CN-XiaoxiaoNeural",
        rate: "10%",
        guidance_level: "heavy",
        created_at: new Date().toISOString()
    },
    {
        id: "emotion-body-v5",
        title: "⚡ 3分钟晨间苏醒（火焰攀升法）",
        content: `刚醒来，不要急着睁眼。[pause 5s]
把注意力放在你的脚趾尖。想象那里有一簇极其温暖的小火苗。[pause 8s]
感受这股热量从脚底向上攀升，流过你的小腿、膝盖，唤醒沉睡的肌肉。[pause 10s]
暖流经过腹部、胸腔，每一次心跳都泵出新鲜的血液。[pause 10s]
最后冲洗你的头脑。深吸一口气，感受清晨清脆的冷空气。带着这股热量，睁开眼。[pause 5s]`,
        voice_id: VOICES[0]?.id || "zh-CN-XiaoxiaoNeural",
        rate: "10%",
        guidance_level: "heavy",
        created_at: new Date().toISOString()
    },
    {
        id: "emotion-body-v6",
        title: "⚖️ 5分钟面部与感官重置（摘下面具）",
        content: `闭眼。把注意力集中在你的脸上。[pause 8s]
你今天戴了一天的面具，现在，把它摘下来。[pause 10s]
放松你的额头，抚平眉心。放松你的眼皮，让眼球向脑后沉降。[pause 10s]
重点来到下巴。你的牙关是不是紧咬着？松开它。让舌头软软地趴在口腔底部。[pause 15s]
感受脸颊的肌肉因为地球引力而微微下垂。享受这种毫无防备的、纯粹的物理松弛。[pause 20s]`,
        voice_id: VOICES[0]?.id || "zh-CN-XiaoxiaoNeural",
        rate: "10%",
        guidance_level: "medium",
        created_at: new Date().toISOString()
    },
    {
        id: "emotion-body-v7",
        title: "⚖️ 5分钟下半身扎根练习",
        content: `坐直。把注意力全部沉入肚脐以下。[pause 8s]
感受臀部与椅子的接触面，感受那里承载的几十公斤的重量。[pause 15s]
感受大腿后侧的肌肉如何被压扁、被支撑。[pause 10s]
感受双脚，尤其是脚后跟，踩在地板上的摩擦力。[pause 15s]
你的上半身可以随风摇摆，但你的下半身，是一座极其沉稳的石塔。没有任何东西能推翻你。[pause 20s]`,
        voice_id: VOICES[0]?.id || "zh-CN-XiaoxiaoNeural",
        rate: "10%",
        guidance_level: "medium",
        created_at: new Date().toISOString()
    },
    {
        id: "emotion-body-v8",
        title: "⚖️ 7分钟渐进式肌肉放松（PMR缩影）",
        content: `闭眼。我们将交替体验极度的紧张与极度的放松。[pause 8s]
深吸气，用力攥紧你的双拳，死死咬住牙，紧缩全身肌肉！坚持住！[pause 8s]
呼气！瞬间全部松开！[pause 15s]
仔细体会放松后的四肢那种微微发麻、发热的感觉。去品尝这种肌肉纤维散开的快感。[pause 15s]
再来一次。吸气，紧缩双腿、臀部、腹部！[pause 5s]
呼气，彻底瘫软。你是一滩正在融化在阳光下的冰水。[pause 20s]`,
        voice_id: VOICES[0]?.id || "zh-CN-XiaoxiaoNeural",
        rate: "10%",
        guidance_level: "medium",
        created_at: new Date().toISOString()
    },
    {
        id: "emotion-body-v9",
        title: "⚖️ 10分钟温水浸泡法",
        content: `想象你正躺在一个空浴缸里。闭上眼。[pause 8s]
最完美的温水，开始从脚底涌入。
感受温水没过脚面，包裹住脚踝。那种温暖驱散了所有的寒冷。[pause 15s]
水位缓缓上升。漫过小腿、膝盖、大腿。[pause 15s]
感受被水浮起的轻盈感。水没过腹部、胸口，温热的水流抚平了心跳。[pause 20s]
水漫过肩膀、后颈。你只露出嘴巴和鼻子在呼吸。全身都浸泡在绝对的安全与温暖之中。[pause 20s]`,
        voice_id: VOICES[0]?.id || "zh-CN-XiaoxiaoNeural",
        rate: "10%",
        guidance_level: "light",
        created_at: new Date().toISOString()
    },
    {
        id: "emotion-body-v10",
        title: "⚖️ 10分钟骨骼透视法",
        content: `放弃对肌肉的感知。今天，我们只观察身体最核心的支架：骨骼。[pause 8s]
感受你头骨的重量。它像一颗沉重的保龄球，安稳地压在颈椎上。[pause 15s]
顺着颈椎向下，感受那一节一节精密的脊椎骨。它们坚韧地支撑着你。[pause 15s]
感受骨盆的庞大与坚固，像一个承托一切的厚重脸盆。[pause 15s]
感受大腿骨的粗壮。去体会这种抛开血肉后，深藏在身体内部的、极其冷硬但也极其可靠的支撑力。[pause 20s]`,
        voice_id: VOICES[0]?.id || "zh-CN-XiaoxiaoNeural",
        rate: "10%",
        guidance_level: "light",
        created_at: new Date().toISOString()
    },
    {
        id: "emotion-body-v11",
        title: "🌌 15分钟重力剥夺（太空悬浮感）",
        content: `平躺。今天，我们将剥离地球的引力。[pause 10s]
深呼吸。感受你的身体非常沉重，压在床垫上。[pause 15s]
现在，想象床垫的支撑力突然消失了。你并没有坠落，而是开始极其缓慢地……向上漂浮。[pause 20s]
感受脚跟脱离了床单。双腿失去了重量。[pause 15s]
感受背部、双臂、后脑勺，全部悬浮在没有摩擦力的绝对真空中。[pause 20s]
没有方向，没有边界。你是一颗漂浮在无垠宇宙中的微小陨石。极度轻盈，极度自由。[pause 30s]`,
        voice_id: VOICES[0]?.id || "zh-CN-XiaoxiaoNeural",
        rate: "10%",
        guidance_level: "light",
        created_at: new Date().toISOString()
    },
    {
        id: "emotion-body-v12",
        title: "🌌 15分钟内脏温柔觉察",
        content: `平躺。我们总是向外看，今天，向内看看那些无声为你工作的器官。[pause 10s]
把注意力放在左胸口。感受心脏不辞辛劳的泵动，这是你生命最原始的节拍。感谢它。[pause 20s]
转移到两侧肋骨下方，感受肺部的扩张与收缩。它在不知疲倦地为你过滤氧气。[pause 20s]
来到腹部深处。感受胃部和肠道的蠕动。它们在沉默地为你消化一切焦虑与营养。[pause 20s]
对这具精密、忠诚的躯体说一声谢谢。它永远是你最忠实的盟友。[pause 30s]`,
        voice_id: VOICES[0]?.id || "zh-CN-XiaoxiaoNeural",
        rate: "10%",
        guidance_level: "light",
        created_at: new Date().toISOString()
    },
    {
        id: "emotion-body-v13",
        title: "🌌 20分钟痛觉融化法（接纳不适）",
        content: `如果你身上某处感到酸痛、不适，不要试图把注意力移开。[pause 10s]
把聚光灯直接打在那个痛点上。看着它。[pause 15s]
不要给它贴上“糟糕”的标签。去观察这种感觉的质地。是刺痛？酸胀？还是沉闷的跳动？[pause 20s]
深吸气，想象你把大量的新鲜氧气，直接吸入这个疼痛的部位。[pause 15s]
缓慢呼气。在呼气时，不要试图驱赶疼痛，而是给它周围留出更多的空间。让它待在那里，与它和平共处。你比疼痛大得多。[pause 30s]`,
        voice_id: VOICES[0]?.id || "zh-CN-XiaoxiaoNeural",
        rate: "10%",
        guidance_level: "light",
        created_at: new Date().toISOString()
    },
    {
        id: "emotion-body-v14",
        title: "🌌 20分钟断电式深眠（逐寸关机）",
        content: `你的身体是一台运转了一整天的机器。现在，该拉下电闸了。[pause 15s]
我们从最底部的脚趾开始。想象听到“咔哒”一声，脚趾断电了。它们彻底失去了知觉。[pause 20s]
咔哒。脚踝断电。陷入绝对的瘫软。[pause 20s]
咔哒。双腿断电。它们现在只是一堆没有生命的重物。[pause 20s]
咔哒。骨盆、腹部断电。内部的喧哗彻底平息。[pause 30s]
咔哒。胸腔断电。呼吸变成极其微弱的本能。[pause 30s]
咔哒。双手、双臂断电。沉入床垫的深渊。[pause 30s]
咔哒。最后，切断大脑的电源。视觉消失。听觉消散。沉入无底的、柔软的黑夜……[pause 40s]`,
        voice_id: VOICES[0]?.id || "zh-CN-XiaoxiaoNeural",
        rate: "10%",
        guidance_level: "light",
        created_at: new Date().toISOString()
    },
    {
        id: "emotion-body-v15",
        title: "🏃 10分钟动态扫描（行走中的内观）",
        content: `无论你是在通勤，还是在散步。睁着眼。保持匀速走动。[pause 8s]
把所有的注意力集中到脚底。[pause 10s]
去分解行走的动作。感受脚后跟首先接触地面的瞬间……[pause 8s]
感受身体的重量极其丝滑地从脚后跟，滚动到脚掌，最后到脚趾……[pause 10s]
感受另一只脚抬起时，膝盖微曲的机械结构。[pause 15s]
你不再是“走在街上的人”。你只是一具正在精妙运作的骨骼与肌肉的复合体。感受这种机械运转的纯粹美感。[pause 20s]`,
        voice_id: VOICES[0]?.id || "zh-CN-XiaoxiaoNeural",
        rate: "10%",
        guidance_level: "medium",
        created_at: new Date().toISOString()
    },
    {
        id: "emotion-body-v16",
        title: "🏃 8分钟赛博释压（电脑前工作者）",
        content: `停下敲击键盘的手。闭上眼。把后背靠在椅子上。[pause 8s]
把注意力集中在你的眼睛。它们因为长时间盯着屏幕已经极其干涩。不要用力闭眼，只需轻轻合上眼皮，让眼球泡在泪液里休息。[pause 15s]
来到你的右手手腕。感受长期使用鼠标带来的肌肉发僵。轻轻抖动一下手腕，然后让它瘫在腿上。[pause 15s]
感受因为含胸驼背而发酸的颈椎和后背。深吸一口气，用肺部的扩张强行撑开胸腔！[pause 10s]
缓慢呼气。切断你和那个发光屏幕的所有精神链接。你是一个肉体，不是机器的延长线。[pause 20s]`,
        voice_id: VOICES[0]?.id || "zh-CN-XiaoxiaoNeural",
        rate: "10%",
        guidance_level: "medium",
        created_at: new Date().toISOString()
    }
];
