class Memo {
  constructor(id, title, text, base, tags, category) {
    this._id = id; // Integer
    this._title = title; // String
    this._text = text; // String
    this._base = base; // String
    this._tags = tags; // String
    this._category = category; // String
  }
  get id() { return this._id; }
  get title() { return this._title; }
  get text() { return this._text; }
  get base() { return this._base; }
  get tags() { return this._tags; }
  get category() { return this._category; }
}
// Model
// Memoクラスのリスト
var data = [
  new Memo(0, 'title0', 'text0', 'base-text0', 'tag0', 'category0'),
  new Memo(1, 'title1', 'text1', 'base-text1', 'tag1', 'category1'),
  new Memo(2, 'title2', 'text2', 'base-text2', 'tag2', 'category2'),
  new Memo(3, 'title3', 'text3', 'base-text3', 'tag3', 'category3'),
  new Memo(4, 'title4', 'text4', 'base-text4', 'tag4', 'category4'),
  new Memo(5, 'title5', 'text5', 'base-text5', 'tag5', 'category5'),
  new Memo(6, 'title4', 'text6', 'base-text6', 'tag6', 'category6'),
  new Memo(7, 'title4', 'text7', 'base-text7', 'tag7', 'category7'),
  new Memo(8, 'title4', 'text8', 'base-text8', 'tag8', 'category8'),
  new Memo(9, 'title4', 'text9', 'base-text9', 'tag9', 'category9'),
  new Memo(10, 'title10', 'text10', 'base-text10', 'tag10', 'category10'),
  new Memo(11, 'title11', 'text11', 'base-text11', 'tag11', 'category11'),
  new Memo(12, 'title12', 'text12', 'base-text12', 'tag12', 'category12'),
  new Memo(13, 'title13', 'text13', 'base-text13', 'tag13', 'category13'),
  new Memo(14, 'title14', 'text14', 'base-text14', 'tag14', 'category14'),
  new Memo(15, 'title15', 'text15', 'base-text15', 'tag15', 'category15')
];

let request = function(api, send, callback) {
  // handle single request(only POST) with superagent
  superagent
    .post(api)
    .send(send)
    .set('Accept', 'application/json')
    .end(callback);
}

// 基本的にContainerが親玉
// ContainerのsetState処理を子のViewにpropsとして渡すことにより実行する
let Container = React.createClass({
  propTypes: {
    data: React.PropTypes.arrayOf(React.PropTypes.instanceOf(Memo)).isRequired
  },
  getInitialState: function() {
    return {
      data: this.props.data,
      view: <MemoListView data={this.props.data} edit={this.edit} memoview={this.memoview} new={this.new} />,
    };
  },
  componentDidMount: function() {
    // let send = { fromIndex: 10, quantity: 10 };
    // request('/memo/api/get', send, function(err, res) {
    //   if (err || !res.ok) {
    //     alert('Oh no! error');
    //   } else {
    //     let json = res.body;
    //     console.log(json);
    //     console.log(json.data);
    //   }
    // });
  },
  // Router(Viewを生成)
  new: function() {
    this.setState({view: (
      <EditView back={this.back} memo={new Memo(-1,'','','','','')}>
      </EditView>
    )});
  },
  edit: function(memo) {
    this.setState({view: (
      <EditView back={this.back} memo={memo}>
      </EditView>
    )});
  },
  memoview: function(memo) {
    this.setState({view: (
      <MemoView back={this.back} memo={memo}>
      </MemoView>
    )});
  },
  back: function() {
    this.setState({view: (
      <MemoListView data={this.state.data} edit={this.edit} memoview={this.memoview} new={this.new} />
    )});
  },
  render: function() {
    return (
      <div>
        {this.state.view}
      </div>
    );
  }
});

let MemoListView = React.createClass ({
  propTypes: {
    data: React.PropTypes.arrayOf(React.PropTypes.instanceOf(Memo)).isRequired,
    edit: React.PropTypes.func.isRequired,
    memoview: React.PropTypes.func.isRequired,
    new: React.PropTypes.func.isRequired
  },
  render() {
    let memoNodes = this.props.data.map(function(memo) {
      return (
        <MemoBox memo={memo} key={memo.id} edit={this.props.edit} memoview={this.props.memoview} />
      );
    }.bind(this));
    return (
      <div className='row'>
        <div onClick={this.props.new}>new</div>
        {memoNodes}
      </div>
    );
  }
});

let MemoBox = React.createClass({
  propTypes: {
    memo: React.PropTypes.instanceOf(Memo).isRequired,
    edit: React.PropTypes.func.isRequired,
    memoview: React.PropTypes.func.isRequired
  },
  open_edit() {
    this.props.edit(this.props.memo);
  },
  open_memoview() {
    this.props.memoview(this.props.memo);
  },
  render() {
    return (
      <React.addons.CSSTransitionGroup transitionName='view-change' transitionAppear={true}>
        <div className='col-md-6'>
          <h2>{this.props.memo.title}</h2>
          <p>{this.props.memo.text}</p>
          <h4>{this.props.memo.tags}</h4>
          <h4>{this.props.memo.category}</h4>
          <b onClick={this.open_edit}>edit</b>
          <b onClick={this.open_memoview}>view</b>
        </div>
      </React.addons.CSSTransitionGroup>
    );
  }
});

let MemoView = React.createClass({
  propTypes: {
    back: React.PropTypes.func.isRequired,
    memo: React.PropTypes.instanceOf(Memo).isRequired
  },
  render() {
    return (
      <React.addons.CSSTransitionGroup transitionName='view-change' transitionAppear={true}>
        <div>
          <div onClick={this.props.back} className='glyphicon glyphicon-remove'></div>
          Article
          <h3>{this.props.memo.title}</h3>
          <h3>{this.props.memo.tags}</h3>
          <h3>{this.props.memo.text}</h3>
        </div>
      </React.addons.CSSTransitionGroup>
    );
  }
});

let EditView = React.createClass({
  propTypes: {
    back: React.PropTypes.func.isRequired,
    memo: React.PropTypes.instanceOf(Memo).isRequired
  },
  getInitialState: function() {
    return {
      title: this.props.memo.title,
      text: this.props.memo.text,
      base: this.props.memo.base,
      tags: this.props.memo.tags,
      tag_options: [],
      tag_loading: true,
      new_tag: '',
      category: this.props.memo.category,
      new_category: '',
      category_options: [],
      category_loading: true
    };
  },
  componentDidMount: function() {
    this.getTagOptions();
    this.getCategoryOptions();
  },
  getTagOptions: function() {
    request('/api/read/tag', {}, function(err, res) {
      if (err || !res.ok) {
        alert('Oh no! error');
      } else {
        let tag_options = res.body.data.map(function(x) { return {label: x.name, value: x.name}; });
        this.setState({
          tag_options: tag_options,
          tag_loading: false
        });
      }
    }.bind(this));
  },
  getCategoryOptions: function() {
    request('/api/read/category', {}, function(err, res) {
      if (err || !res.ok) {
        alert('Oh no! error');
      } else {
        let category_options = res.body.data.map(function(x) { return {label: x.name, value: x.name}; });
        this.setState({
          category_options: category_options,
          category_loading: false
        });
      }
    }.bind(this));
  },
  clickTagCreate: function(e) {
    e.preventDefault();
    e.target.disabled = true;
    request('/api/create/tag', {name: this.state.new_tag}, function(err, res) {
      if (err || !res.ok) {
        alert('Oh no! error');
      } else {
        this.getTagOptions();
        this.setState({new_tag: ''});
      }
    }.bind(this));
  },
  clickCategoryCreate: function(e) {
    e.preventDefault();
    e.target.disabled = true;
    request('/api/create/category', {name: this.state.new_category}, function(err, res) {
      if (err || !res.ok) {
        alert('Oh no! error');
      } else {
        this.getCategoryOptions();
        this.setState({new_category: ''});
      }
    }.bind(this));
  },
  handleTitleChange: function(e) {
    this.setState({title: e.target.value});
  },
  handleBaseChange: function(e) {
    this.setState({base: e.target.value});
  },
  handleNewTagChange: function(e) {
    this.setState({new_tag: e.target.value});
  },
  handleNewCategoryChange: function(e) {
    this.setState({new_category: e.target.value});
  },
  handleTagChange: function(value) {
    this.setState({tags: value});
  },
  handleCategoryChange: function(value) {
    this.setState({category: value});
  },
  handleSubmit: function(e) {
    e.preventDefault();
    // TODO: 簡易バリデーション
    let api = (this.props.memo.id < 0) ? '/memo/api/create' : '/memo/api/update';
    let send = {
      title: this.state.title.trim(),
      base: this.state.base.trim(),
      tags: [],
      category: this.state.category.trim()
    };
    request(api, send, function(err, res) {
      if (err || !res.ok) {
        alert('Oh no! error');
      } else {
        let json = res.body;
        this.props.back();
      }
    }.bind(this));
  },
  render() {
    let form = (
      <form className='form-horizontal' onSubmit={this.handleSubmit}>
        <div className='form-group'>
          <input className='form-control' placeholder='Title'
            value={this.state.title} onChange={this.handleTitleChange} />
        </div>
        <div className='form-group'>
          <ul className='nav nav-pills'>
            <li className='active'><a href='#'>Edit</a></li>
            <li><a href='#'>Preview</a></li>
          </ul>
          <textarea className='form-control' rows='10' placeholder='Text(Markdown)'
            value={this.state.base} onChange={this.handleBaseChange} />
        </div>
        <div className='form-group'>
          <div className='row'>
            <div className='col-md-8'>
              <Select multi simpleValue
                value={this.state.tags} options={this.state.tag_options}
                isLoading={this.state.tag_loading} onChange={this.handleTagChange} placeholder='Tags...' /> 
            </div>
            <div className='col-md-4'>
              <div className='input-group'>
                <input className='form-control' placeholder='new tag...'
                  value={this.state.new_tag} onChange={this.handleNewTagChange}/>
                <div className='input-group-btn'>
                  <button className='btn btn-default' onClick={this.clickTagCreate}>Create</button>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className='form-group'>
          <div className='row'>
            <div className='col-md-8'>
              <Select value={this.state.category} options={this.state.category_options}
                isLoading={this.state.category_loading} onChange={this.handleCategoryChange} placeholder='Category...' /> 
            </div>
            <div className='col-md-4'>
              <div className='input-group'>
                <input className='form-control' placeholder='new category...'
                  value={this.state.new_category} onChange={this.handleNewCategoryChange}/>
                <div className='input-group-btn'>
                  <button className='btn btn-default' onClick={this.clickCategoryCreate}>Create</button>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className='form-group'>
          <button type='submit' className='btn btn-default'>Submit</button>
        </div>
      </form>
    );
    return (
      <React.addons.CSSTransitionGroup transitionName='view-change' transitionAppear={true}>
        <div>
          <div onClick={this.props.back} className='glyphicon glyphicon-remove'></div>
          {form}
        </div>
      </React.addons.CSSTransitionGroup>
    );
  }
});

ReactDOM.render(
  <Container data={data} />, document.getElementById('content')
);
