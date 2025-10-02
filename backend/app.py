from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
import os
from datetime import datetime

app = Flask(__name__)

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

@app.route('/')
def hello_world():
    return 'Hello, World!'

if __name__ == '__main__':
    app.run(debug=True)