const fs = require('fs');
const file = '/Users/lijiahao/medetation/app/api/generate-reminder/route.ts';
let content = fs.readFileSync(file, 'utf8');

const target = `            if (elapsedTime <= 30) {
                rainStage = "【第0阶段：D - Diagnosis 后续巩固期】";
                rainCommand = "承接开场的诊断定调，不要再长篇大论分析了！直接用几个极其简短有力的字词（10个字左右）持续敲打他，让他不要怂。比如‘盯死那个谎言’、‘别移开视线’、‘就在这站稳’。";
            } else if (elapsedTime <= 90) {
                rainStage = "【第1阶段：R - Recognize 识别】";
                rainCommand = "提醒他浪潮已经正式袭来。不要去逃避它，而是转过头直面这波巨浪。直接指出：‘你看，因为那个诱因，这股渴望果然冲过来了。深吸气，稳住重心。’";
            } else if (elapsedTime <= 150) {
                rainStage = "【第2阶段：A - Allow 允许】";
                rainCommand = "教他放弃用纯理智或意志力去“镇压”不适。告诉他越压制越反弹，放任它狂暴肆虐，就像海浪呼啸而过，你只需要站在踏浪板上不要被卷进去。接纳它存在的事实。";
            } else if (elapsedTime <= 360) {
                rainStage = "【第3阶段：I - Investigate 探究】（好奇心核心阶段：极端细致的肉体拆解）";
                rainCommand = "这是解药所在！使用显微镜级别的好奇心，带他去找身体究竟哪里不舒服（尤其是他初始档案里写的部位）。极其细致地提问：‘深处的挤压感是锐利的还是模糊的？’ 把巨大抽象的‘我想抽烟’，一寸寸降维成单纯的物理感觉。让他闭着眼死盯着那块不舒服的肉！";
            } else {
                rainStage = "【第4阶段：N - Non-Identification 非认同】";
                rainCommand = "教导他把自己和这种现象彻底剥离开：你不是你的欲望，你只是一个感受着这股能量的载体。引导他**回顾并对比起初上报的渴望强度得分**，问他：‘仔细体会一下，最开始那股让你觉得无法承受的X分窒息能量，现在降到几分了？’ 让他亲眼见证这股能量由于没有被满足，正在无可避免地衰退和饿死。";
            }`;

const replacement = `            if (elapsedTime <= 30) {
                rainStage = "【第0阶段：D - Diagnosis 诊断定调】";
                rainCommand = "承接开场诊断。用极简短的话（10字左右）巩固战术宣言。例如：'盯死那个谎言'、'别移开视线'、'稳住，就在这'。不要再重复分析档案。";
            } else if (elapsedTime <= 90) {
                rainStage = "【第1阶段：R - Recognize 识别与标签化】";
                rainCommand = "布鲁尔RAIN第一步：让他给渴望贴标签！要求他在心里默念'我注意到一股想抽烟的渴望正在升起'。这个'注意到'是关键——前额叶皮层激活，他就从渴望的自动驾驶模式中跳出来变成旁观者。你必须引导他做这个标签化动作，例如：'在心里说——我注意到了，有一股力量正在涌上来。'禁止：不要在这个阶段探索身体感觉，那是第3阶段的事！";
            } else if (elapsedTime <= 150) {
                rainStage = "【第2阶段：A - Allow 允许与不抵抗】";
                rainCommand = "布鲁尔RAIN第二步：放下武器，停止战斗！让他松开握紧的拳头或放松紧绷的肩膀，用一次深长的呼气象征性地'放下抵抗'。意志力压制渴望会激活交感神经反而加强渴望回路。停止战斗，让渴望自由存在，它反而失去被喂养的燃料。你必须引导他做'放下'的身体动作，例如：'松开你握紧的拳头。呼——让这股力量就这么待着，不赶走它。'禁止：不要说'去感受它在哪里'，那是第3阶段！这个阶段只做一件事——停止抵抗。";
            } else if (elapsedTime <= 360) {
                rainStage = "【第3阶段：I - Investigate 好奇探究】（布鲁尔的核心解药阶段）";
                rainCommand = "布鲁尔RAIN第三步：用好奇心当显微镜拆解身体感觉！让他闭眼把注意力像激光一样锁定在身体最不舒服的那个点上（参考临床档案中的躯体锚点）。每次心跳只问一个具体的物理维度问题：'那个部位的感觉是紧绷的还是灼烧的？' '它有多大？拳头大还是硬币大？' '边缘是清晰的还是模糊扩散的？' '如果给它一个温度，是热的还是冷的？' '这一秒和上一秒比，它变强了还是弱了？' 一旦他对不适感产生真正的好奇心，大脑奖励中枢会被好奇心劫持，多巴胺渴望回路瞬间断电（Brewer称之为curious disenchantment）。禁止：不要泛泛地说'感受你的身体'，必须给出极其具体的单一物理维度的提问！";
            } else {
                rainStage = "【第4阶段：N - Non-Identification 非认同与觉醒】";
                rainCommand = "布鲁尔RAIN第四步：主客体剥离——'你'不是'渴望'！引导他用第三人称审视：'有一个叫做渴望的东西正在经过我，但它不是我。'然后引导他回顾并对比初始渴望强度评分：问他'最开始你说是X分的窒息感，现在再感受一下，它还剩几分？'经过前三阶段的标签化、允许和好奇拆解，渴望的神经冲动已经因为没有被行为满足而开始自然衰减（Brewer称之为riding the wave）。让他亲眼见证分数下降。禁止：即使分数下降了也不要做总结陈词，保持觉察姿态。";
            }`;

if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync(file, content, 'utf8');
    console.log("Patch applied successfully!");
} else {
    console.log("Error: Target content not found in route.ts!");
}
