# backend/init_db.py
import os
from datetime import datetime
from app import app, db, User, Opportunity # Import models and db from app.py

def create_test_data():
    with app.app_context():
        # Ensure tables are created if they don't exist
        db.create_all()
        print("Database tables ensured to be created.")

        # 2. Create or update a test user
        test_user_openid = "test_user_001"
        user_profile_content = """# 张三

---

### 联系方式
- **电话**: 138-1234-5678
- **邮箱**: zhangsan@email.com
- **GitHub**: github.com/zhangsan

### 教育背景
- **X大学** - 软件工程 - 本科 (2021-2025)
- 主要课程: 数据结构, 算法, 操作系统, 计算机网络
- GPA: 3.8/4.0

### 校园经历
**X大学学生会 - 技术部 (2022.09 - 2023.09)**
- 负责维护学生会官方网站，并使用Node.js开发活动发布接口。
- 参与开发了一款在线活动报名小程序，方便同学报名参与，获得了广泛好评。

### 项目经历
**基于Python的图书管理系统 (课程设计)**
- 使用 Flask 和 SQLite 设计并开发了一个支持多人在线借阅的图书管理系统。
- 实现了用户的注册, 登录, 图书查询, 借阅和归还功能。
- 通过Nginx部署在个人服务器上，了解了基本的运维知识。

### 荣誉奖项
- X大学一等奖学金 (2022, 2023)
- 全国大学生数学建模竞赛二等奖 (2023)

### 技能
- **编程语言**: 熟练掌握 Python, JavaScript, Java
- **技术栈**: Flask, Vue.js, Node.js, MySQL, Redis
- **工具**: Git, Docker, VS Code

### 自我评价
- 对新技术充满热情，具备良好的自学能力和解决问题的能力。
- 拥有团队合作精神，善于沟通，能快速融入团队。
- 责任心强，对代码质量有追求，有良好的编码习惯."""

        user = User.query.filter_by(openid=test_user_openid).first()
        if user:
            print(f"Test user '{user.name}' with openid '{user.openid}' already exists. Updating...")
            user.name = "张三"
            user.avatar_url = "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=1888&auto=format&fit=crop"
            user.profile_content = user_profile_content
        else:
            print(f"Test user with openid '{test_user_openid}' not found. Creating new user...")
            user = User(
                openid=test_user_openid,
                name="张三",
                avatar_url="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=1888&auto=format&fit=crop",
                profile_content=user_profile_content
            )
            db.session.add(user)
        
        # Debug print before commit
        print(f"DEBUG (init_db): User object before commit: {user.to_dict()}")
        
        db.session.commit()
        print(f"Test user '{user.name}' (openid: '{user.openid}') ensured in database.")

        # 3. Clear existing opportunities for the test user and re-create them
        Opportunity.query.filter_by(user_id=user.id).delete()
        db.session.commit()
        print(f"Existing opportunities for user '{user.name}' cleared.")

        mock_opportunities = [
            { 'position_name': '前端开发工程师', 'company_name': '谷歌 (Google)', 'status': '面试中', 'latest_progress': '下一轮: 技术二面 (明天)', 'job_description': '负责谷歌搜索前端界面的开发与维护，要求熟悉React/Vue，有大型项目经验。', 'source': '内推' },
            { 'position_name': '后端工程师', 'company_name': 'Meta', 'status': '已投递', 'latest_progress': '3天前已申请', 'job_description': '负责Facebook核心社交功能的后端服务开发，要求熟悉Python/Go，有高并发系统设计经验。', 'source': '官网' },
            { 'position_name': '产品经理', 'company_name': '亚马逊 (Amazon)', 'status': '已发Offer', 'latest_progress': '已收到Offer, 待确认', 'job_description': '负责亚马逊电商平台产品规划与设计，要求有用户增长经验，熟悉数据分析。', 'source': '猎头' },
            { 'position_name': '数据科学家', 'company_name': '网飞 (Netflix)', 'status': '已结束', 'latest_progress': '流程已终止', 'job_description': '负责内容推荐算法的研发与优化，要求熟悉机器学习，有大数据处理经验。', 'source': 'LinkedIn' }
        ]

        for opp_data in mock_opportunities:
            opportunity = Opportunity(
                user_id=user.id,
                position_name=opp_data['position_name'],
                company_name=opp_data['company_name'],
                job_description=opp_data['job_description'],
                source=opp_data['source'],
                status=opp_data['status'],
                latest_progress=opp_data['latest_progress']
            )
            db.session.add(opportunity)
        db.session.commit()
        print(f"{len(mock_opportunities)} test opportunities created for user '{user.name}'.")

        print("Test data generation complete.")

if __name__ == '__main__':
    create_test_data()
