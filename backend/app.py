from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
import os
from datetime import datetime
import markdown # Moved to top
from xhtml2pdf import pisa # Moved to top

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

# Configure persistent SQLite database
basedir = os.path.abspath(os.path.dirname(__file__))
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(basedir, 'interview.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# Define the User model
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    openid = db.Column(db.String(255), unique=True, nullable=False)
    name = db.Column(db.String(255))
    avatar_url = db.Column(db.String(255))
    profile_content = db.Column(db.Text)

    # Relationship to opportunities
    opportunities = db.relationship('Opportunity', backref='user', lazy=True)

    def __repr__(self):
        return f'<User {self.name}>'

    def to_dict(self):
        return {
            'id': self.id,
            'openid': self.openid,
            'name': self.name,
            'avatar_url': self.avatar_url,
            'profile_content': self.profile_content
        }

# Define the Opportunity model
class Opportunity(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    position_name = db.Column(db.String(255), nullable=False)
    company_name = db.Column(db.String(255), nullable=False)
    job_description = db.Column(db.Text)
    source = db.Column(db.String(100))
    status = db.Column(db.String(50)) # e.g., '待投递', '面试中', '已发Offer'
    latest_progress = db.Column(db.String(255))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f'<Opportunity {self.company_name} - {self.position_name}>'

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'position_name': self.position_name,
            'company_name': self.company_name,
            'job_description': self.job_description,
            'source': self.source,
            'status': self.status,
            'latest_progress': self.latest_progress,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

# Create database tables (original place)
with app.app_context():
    db.create_all()

# API Endpoints for User
@app.route('/users', methods=['POST'])
def create_or_update_user():
    data = request.get_json()
    openid = data.get('openid')

    name = data.get('name')
    avatar_url = data.get('avatar_url')
    profile_content = data.get('profile_content')

    if not openid:
        return jsonify({'error': 'OpenID is required'}), 400

    user = User.query.filter_by(openid=openid).first()
    if user:
        # Update existing user
        if name is not None:
            user.name = name
        if avatar_url is not None:
            user.avatar_url = avatar_url
        if profile_content is not None:
            user.profile_content = profile_content
        db.session.commit()
        return jsonify(user.to_dict()), 200
    else:
        # Create new user with provided data or defaults
        new_user = User(
            openid=openid,
            name=name if name is not None else "新用户",
            avatar_url=avatar_url if avatar_url is not None else "https://via.placeholder.com/150",
            profile_content=profile_content if profile_content is not None else ""
        )
        db.session.add(new_user)
        db.session.commit()
        return jsonify(new_user.to_dict()), 201

@app.route('/users/<string:openid>', methods=['GET'])
def get_user(openid):
    user = User.query.filter_by(openid=openid).first()
    if user:
        return jsonify(user.to_dict()), 200
    return jsonify({'error': 'User not found'}), 404

@app.route('/users/<string:openid>', methods=['PUT'])
def update_user_profile(openid):
    user = User.query.filter_by(openid=openid).first()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    data = request.get_json()
    profile_content = data.get('profile_content')

    print(f"Received profile_content with length: {len(profile_content)}")

    if profile_content is None:
        return jsonify({'error': 'profile_content is required'}), 400

    user.profile_content = profile_content
    db.session.commit()
    return jsonify(user.to_dict()), 200

# API Endpoints for Opportunity
@app.route('/opportunities', methods=['POST'])
def create_opportunity():
    data = request.get_json()
    user_openid = data.get('user_openid')
    position_name = data.get('position_name')
    company_name = data.get('company_name')
    job_description = data.get('job_description', '')
    source = data.get('source', '')
    status = data.get('status', '待投递')
    latest_progress = data.get('latest_progress', '')

    if not user_openid or not position_name or not company_name:
        return jsonify({'error': 'User OpenID, Position Name, and Company Name are required'}), 400

    user = User.query.filter_by(openid=user_openid).first()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    new_opportunity = Opportunity(
        user_id=user.id,
        position_name=position_name,
        company_name=company_name,
        job_description=job_description,
        source=source,
        status=status,
        latest_progress=latest_progress
    )
    db.session.add(new_opportunity)
    db.session.commit()
    return jsonify(new_opportunity.to_dict()), 201

@app.route('/opportunities/<string:user_openid>', methods=['GET'])
def get_opportunities_by_user(user_openid):
    user = User.query.filter_by(openid=user_openid).first()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    opportunities = Opportunity.query.filter_by(user_id=user.id).all()
    return jsonify([opp.to_dict() for opp in opportunities]), 200

@app.route('/opportunity/<int:opportunity_id>', methods=['GET'])
def get_opportunity(opportunity_id):
    opportunity = Opportunity.query.get(opportunity_id)
    if opportunity:
        return jsonify(opportunity.to_dict()), 200
    return jsonify({'error': 'Opportunity not found'}), 404

@app.route('/opportunity/<int:opportunity_id>', methods=['PUT'])
def update_opportunity(opportunity_id):
    opportunity = Opportunity.query.get(opportunity_id)
    if not opportunity:
        return jsonify({'error': 'Opportunity not found'}), 404

    data = request.get_json()
    opportunity.position_name = data.get('position_name', opportunity.position_name)
    opportunity.company_name = data.get('company_name', opportunity.company_name)
    opportunity.job_description = data.get('job_description', opportunity.job_description)
    opportunity.source = data.get('source', opportunity.source)
    opportunity.status = data.get('status', opportunity.status)
    opportunity.latest_progress = data.get('latest_progress', opportunity.latest_progress)

    db.session.commit()
    return jsonify(opportunity.to_dict()), 200

@app.route('/opportunity/<int:opportunity_id>', methods=['DELETE'])
def delete_opportunity(opportunity_id):
    opportunity = Opportunity.query.get(opportunity_id)
    if not opportunity:
        return jsonify({'error': 'Opportunity not found'}), 404

    db.session.delete(opportunity)
    db.session.commit()
    return jsonify({'message': 'Opportunity deleted'}), 200


@app.route('/opportunity/<int:opportunity_id>/analyze_jd', methods=['POST'])
def analyze_jd(opportunity_id):
    import time
    opportunity = Opportunity.query.get(opportunity_id)
    if not opportunity:
        return jsonify({'error': 'Opportunity not found'}), 404

    user = User.query.get(opportunity.user_id)
    if not user:
        return jsonify({'error': 'User not found for this opportunity'}), 404

    # --- AI Prompt Preparation --- #
    # This is where we would build the prompt for a real AI call.
    prompt = f"""
    请根据以下用户简历和岗位描述（JD），进行深入分析，并以JSON格式返回结果。

    返回的JSON需要包含两个键：
    1. `keywords`: 一个字符串数组，提取出JD中最重要的5-8个核心关键词。
    2. `preMatchText`: 一段字符串，分析用户简历和JD的匹配度，并给出优化建议。

    --- 用户简历 ---
    {user.profile_content}

    --- 岗位描述 (JD) ---
    {opportunity.job_description}
    """

    # For now, we print the prompt to show it's ready for a real AI call.
    print("--- Generated AI Prompt ---")
    print(prompt)
    print("---------------------------")

    # --- Mock AI Call --- #
    # Simulate the delay of a real AI API call
    time.sleep(2)

    # Return a hardcoded mock response
    mock_response = {
        "keywords": ["Python", "Flask", "React", "数据分析", "机器学习", "团队协作"],
        "preMatchText": "[模拟结果] 您的简历与该岗位匹配度较高。您的Python和Flask技能非常吻合。建议在简历中更具体地描述您在React项目中的角色和贡献，以进一步提升竞争力。"
    }

    return jsonify(mock_response), 200


@app.route('/opportunity/<int:opportunity_id>/generate_qa', methods=['POST'])
def generate_qa(opportunity_id):
    import time
    opportunity = Opportunity.query.get(opportunity_id)
    if not opportunity:
        return jsonify({'error': 'Opportunity not found'}), 404

    user = User.query.get(opportunity.user_id)
    if not user:
        return jsonify({'error': 'User not found for this opportunity'}), 404

    # --- AI Prompt Preparation --- #
    prompt = f"""
    请根据以下用户简历和岗位描述（JD），为用户生成5个高频面试问题及对应的建议答案，确保问题类型多样化，覆盖技术、项目、行为等多个方面，并以JSON格式返回。

    返回的JSON需要包含一个键：
    - `qa_list`: 一个对象数组，每个对象包含 `question` 和 `suggested_answer` 两个键。

    --- 用户简历 ---
    {user.profile_content}

    --- 岗位描述 (JD) ---
    {opportunity.job_description}
    """

    print("--- Generated AI Prompt for Q&A ---")
    print(prompt)
    print("-----------------------------------")

    # --- Mock AI Call --- #
    time.sleep(2)

    # Return a hardcoded mock response
    import random
    num_questions = random.randint(3, 5) # Simulate dynamic number of questions
    mock_qa_list = [
        {
            "question": "请介绍一下你参与过的最有挑战性的项目，你在其中扮演了什么角色，遇到了什么困难，以及如何解决的？",
            "suggested_answer": "建议使用STAR原则（情境、任务、行动、结果）来组织回答，突出你在项目中的贡献和解决问题的能力。"
        },
        {
            "question": "你对我们公司有什么了解？为什么选择我们公司？",
            "suggested_answer": "建议提前研究公司官网、新闻报道和产品，结合自身兴趣和职业规划，真诚表达对公司的认同和向往。"
        },
        {
            "question": "你认为自己最大的优点和缺点是什么？",
            "suggested_answer": "优点要结合岗位要求，举例说明；缺点要选择不影响核心工作能力的，并说明你如何改进。"
        },
        {
            "question": "你对未来的职业发展有什么规划？",
            "suggested_answer": "结合个人兴趣和行业发展趋势，展示清晰的职业目标和为之努力的计划。"
        },
        {
            "question": "你有什么问题想问我们吗？",
            "suggested_answer": "准备2-3个有深度的问题，体现你对公司和岗位的思考，例如关于团队文化、项目挑战或个人成长机会。"
        }
    ][:num_questions] # Slice to get dynamic number of questions

    return jsonify({"qa_list": mock_qa_list}), 200


@app.route('/opportunity/<int:opportunity_id>/generate_resume', methods=['POST'])
def generate_resume(opportunity_id):
    import time
    opportunity = Opportunity.query.get(opportunity_id)
    if not opportunity:
        return jsonify({'error': 'Opportunity not found'}), 404

    user = User.query.get(opportunity.user_id)
    if not user:
        return jsonify({'error': 'User not found for this opportunity'}), 404

    data = request.get_json()
    keywords = data.get('keywords', '')

    # --- AI Prompt Preparation --- #
    prompt = f"""
    请根据以下用户简历、岗位描述（JD）和用户指定的关键词，为该用户生成一份高度匹配该岗位的定制化简历，并以Markdown格式返回。

    - **核心要求**: 突出用户技能和经历与JD的契合点。
    - **关键词**: 在简历中巧妙地融入以下关键词: {keywords if keywords else '无'}

    --- 用户简历 ---
    {user.profile_content}

    --- 岗位描述 (JD) ---
    {opportunity.job_description}
    """

    print("--- Generated AI Prompt for Resume ---")
    print(prompt)
    print("--------------------------------------")

    # --- Mock AI Call --- #
    time.sleep(2)

    # Return a hardcoded mock response
    mock_resume_md = f"""# 张三 - {opportunity.position_name} 定制简历

---

### 联系方式
- **电话**: 138-1234-5678
- **邮箱**: zhangsan@email.com
- **GitHub**: github.com/zhangsan

### 核心优势 (针对 {opportunity.company_name})

- **技术匹配**: 熟练掌握 **Python** 和 **Flask** 框架，与岗位要求的技术栈高度契合。
- **经验丰富**: 拥有完整的Web应用开发和部署经验，尤其在图书管理系统项目中，独立完成了从设计到部署的全过程。
- **关键词突出**: {f'在项目中重点应用了 **{keywords}** 等技术。' if keywords else '对岗位要求的各项技能有深入理解。'}

### 项目经历

**基于Python的图书管理系统 (课程设计)**
- **技术栈**: Flask, SQLite, Nginx
- **项目描述**: 独立设计并开发了一个支持多人在线借阅的图书管理系统，旨在提升校园图书流转效率。
- **我的职责**:
  - 实现了用户的注册、登录、图书查询、借阅和归还等核心功能。
  - 设计了数据库模式，并使用 SQLAlchemy 进行数据操作。
  - 通过 Nginx 将应用部署在个人服务器上，积累了基本的Linux运维知识。

*（更多项目细节和校园经历请参考完整版简历）*
"""

    return jsonify({"resume_md": mock_resume_md}), 200


@app.route('/generate_pdf', methods=['POST'])
def generate_pdf_route():
    import time
    # markdown is now imported at the top of the file
    # pisa is now imported at the top of the file

    data = request.get_json()
    resume_md = data.get('resume_md')
    if not resume_md:
        return jsonify({'error': 'No resume content provided'}), 400

    # Define static and temp paths
    static_folder = os.path.join(os.path.dirname(__file__), 'static')
    temp_folder = os.path.join(static_folder, 'temp')
    font_folder = os.path.join(static_folder, 'fonts') # New font folder path
    os.makedirs(temp_folder, exist_ok=True)
    os.makedirs(font_folder, exist_ok=True) # Ensure font folder exists

    # Register font directly with pisa
    font_name = "NotoSansSC"
    font_filepath = os.path.join(font_folder, "NotoSansSC-Regular.ttf")

    # Define link_callback for pisa to resolve resources (like fonts)
    def link_callback(uri, rel):
        # Convert HTML URIs to absolute system paths so xhtml2pdf can access those resources
        if uri.startswith("/static/"):
            path = os.path.join(static_folder, uri.replace("/static/", ""))
            return path
        return uri # default

    if os.path.exists(font_filepath):
        font_family_css = f"font-family: '{font_name}', sans-serif;"
        print(f"INFO: Font '{font_name}' will be used from {font_filepath}")
    else:
        print(f"WARNING: Font file not found at {font_filepath}. Falling back to system font.")
        font_family_css = "font-family: \"SimHei\", sans-serif;" # Fallback to SimHei

    # Convert Markdown to HTML and add CSS for Chinese font support
    html_content = markdown.markdown(resume_md)
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            @font-face {{
                font-family: "NotoSansSC";
                src: url("/static/fonts/NotoSansSC-Regular.ttf") format("truetype");
            }}
            body {{ {font_family_css} line-height: 1.6; }}
            h1 {{ font-size: 22pt; border-bottom: 2px solid #333; padding-bottom: 4px; margin-bottom: 0.8em; }}
            h2 {{ font-size: 18pt; border-bottom: 1px solid #ccc; padding-bottom: 2px; margin-top: 1.5em; margin-bottom: 0.5em; }}
            h3 {{ font-size: 14pt; margin-top: 1.2em; margin-bottom: 0.4em; }}
            ul {{ list-style-type: disc; padding-left: 20px; margin-bottom: 1em; }}
            li {{ margin-bottom: 0.5em; }}
            strong {{ font-weight: bold; }}
            p {{ margin-bottom: 1em; }}
        </style>
    </head>
    <body>
        {html_content}
    </body>
    </html>
    """

    # Define output filename
    output_filename = "generated_resume.pdf"
    output_filepath = os.path.join(temp_folder, output_filename)

    # Generate PDF
    with open(output_filepath, "w+b") as pdf_file:
        pisa_status = pisa.CreatePDF(
            src=html,                # a string or a file-like object
            dest=pdf_file,
            link_callback=link_callback # Pass the link_callback here
        )

    if pisa_status.err:
        return jsonify({'error': 'PDF generation failed'}), 500

    # Return the URL to the generated file
    pdf_url = f"/static/temp/{output_filename}"
    return jsonify({"pdf_url": pdf_url}), 200


@app.route('/')
def hello_world():
    return 'Hello, World!'

if __name__ == '__main__':
    app.run(debug=True)