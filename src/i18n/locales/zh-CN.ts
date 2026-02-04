/**
 * 中文（简体）语言包
 */
export default {
  // 应用
  app: {
    welcome: "欢迎使用 {name}",
  },

  // 通用
  common: {
    confirm: "确认",
    cancel: "取消",
    save: "保存",
    delete: "删除",
    edit: "编辑",
    add: "添加",
    search: "搜索",
    reset: "重置",
    submit: "提交",
    back: "返回",
    next: "下一步",
    previous: "上一步",
    loading: "加载中...",
    noData: "暂无数据",
    success: "操作成功",
    failed: "操作失败",
    error: "发生错误",
    warning: "警告",
    info: "提示",
  },

  // 表单验证
  validation: {
    required: "此字段为必填项",
    invalidParams: "请求参数无效",
    email: "请输入有效的邮箱地址",
    url: "请输入有效的URL地址",
    password: "密码至少8位，包含大小写字母、数字和特殊字符",
    minLength: "长度不能少于 {min} 个字符",
    maxLength: "长度不能超过 {max} 个字符",
    length: "长度必须在 {min} 到 {max} 个字符之间",
    number: "请输入有效的数字",
    integer: "请输入整数",
    positive: "请输入正数",
    negative: "请输入负数",
    range: "数值必须在 {min} 到 {max} 之间",
  },

  // 健康检查
  health: {
    healthy: "服务正常运行",
    alive: "服务存活",
    ready: "服务就绪",
    notReady: "服务未就绪",
  },

  // 错误提示
  error: {
    dbOperationFailed: "数据库操作失败",
    dbConnectionFailed: "数据库连接失败",
    internalServerError: "服务器内部错误",
    network: "网络错误，请检查网络连接",
    timeout: "请求超时，请稍后重试",
    server: "服务器错误，请稍后重试",
    notFound: "未找到请求的资源",
    unauthorized: "未授权，请先登录",
    forbidden: "没有权限访问",
    unknown: "未知错误",
    badRequest: "请求参数错误",
    conflict: "资源冲突",
    tooManyRequests: "请求过于频繁，请稍后重试",
  },

  // 成功提示
  success: {
    list: "获取成功",
    saved: "保存成功",
    deleted: "删除成功",
    updated: "更新成功",
    created: "创建成功",
    login: "登录成功",
    logout: "登出成功",
  },

  // 数据库相关
  db: {
    init: {
      start: "开始初始化数据库...",
      tableCreated: "用户表创建成功",
      tableCreateFailed: "创建用户表失败",
      tableStructureMismatch: "用户表存在但结构可能不匹配，请运行 prisma:migrate 同步表结构",
      ensureUserTableError: "确保用户表存在时出错",
      checkTableError: "检查表 {table} 是否存在时出错",
      adminCreated: "默认管理员账户创建成功",
      adminExists: "默认管理员账户已存在，跳过创建",
      adminCreateFailed: "创建默认管理员账户失败",
      completed: "数据库初始化完成",
      failed: "数据库初始化失败",
    },
    query: {
      modelNotFound: "模型 {model} 不存在",
      updateRequiresWhere: "更新操作必须包含 Where 条件",
      deleteRequiresWhere: "删除操作必须包含 Where 条件",
    },
  },

  // 认证相关
  auth: {
    loginBodyRequired: "用户名和密码为必填",
    invalidCredentials: "用户名或密码错误",
    tokenExpired: "令牌已过期",
    tokenInvalid: "令牌无效",
    tokenMissing: "缺少认证令牌",
    passwordIncorrect: "密码错误",
    userNotFound: "用户不存在",
    userExists: "用户已存在",
    loginRequired: "请先登录",
    permissionDenied: "权限不足",
  },

  // 用户相关
  user: {
    notFound: "用户不存在",
    exists: "用户已存在",
    created: "用户创建成功",
    updated: "用户更新成功",
    deleted: "用户删除成功",
    usernameRequired: "用户名不能为空",
    emailRequired: "邮箱不能为空",
    passwordRequired: "密码不能为空",
    emailInvalid: "邮箱格式不正确",
  },

  // 上传/媒体
  media: {
    fileRequired: "请选择要上传的文件",
    fileTypeNotAllowed: "不允许该文件类型",
    fileTooLarge: "文件过大，请检查大小限制",
    storageUnavailable: "存储服务暂不可用",
    uploadFailed: "上传到存储失败",
    listFailed: "获取文件列表失败",
    metadataNameValueRequired: "元数据每条目的名称与值均不能为空",
  },

  // 日志（服务端）
  log: {
    apiException: "API 异常",
    dbError: "数据库异常",
    dbConnectionError: "数据库连接异常",
    unhandledError: "未处理的异常",
  },

  // 服务器相关
  server: {
    started: "服务器启动成功",
    startFailed: "服务器启动失败",
    shutdown: "服务器关闭",
  },
};
