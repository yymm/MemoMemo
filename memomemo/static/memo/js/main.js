class Memo {
  constructor(id, title, text, base, tag, category) {
    this._id = id; // Integer
    this._title = title; // String
    this._text = text; // String
    this._base = base; // String
    this._tag = tag; // String
    this._category = category; // String
  }
  get id() { return this._id; }
  get title() { return this._title; }
  get text() { return this._text; }
  get base() { return this._base; }
  get tag() { return this._tag; }
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
    let send = { fromIndex: 10, quantity: 10 };
    request('/memo/api/get', send, function(err, res) {
      if (err || !res.ok) {
        alert('Oh no! error');
      } else {
        let json = res.body;
        console.log(json);
        console.log(json.data);
      }
    });
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
          <h4>{this.props.memo.tag}</h4>
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
          <h3>{this.props.memo.tag}</h3>
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
      tag: this.props.memo.tag,
      category: this.props.memo.category,
    };
  },
  componentDidMount: function() {
  },
  getTag: function() {
  },
  getCategory: function() {
  },
  clickTagCreate: function(e) {
    e.preventDefault();
  },
  clickCategoryCreate: function(e) {
    e.preventDefault();
  },
  handleTitleChange: function(e) {
    this.setState({title: e.target.value});
  },
  handleBaseChange: function(e) {
    this.setState({base: e.target.value});
  },
  clickTagSelect: function(e) {
    e.preventDefault();
  },
  clickCategorySelect: function(e) {
    e.preventDefault();
  },
  handleSubmit: function(e) {
    e.preventDefault();
    // TODO: 簡易バリデーション
    let api = (this.props.memo.id < 0) ? '/memo/api/create' : '/memo/api/update';
    let send = {
      title: this.state.title.trim(),
      base: this.state.base.trim(),
      tag: this.state.tag.trim(),
      category: this.state.category.trim()
    };
    request(api, send, function(err, res) {
      if (err || !res.ok) {
        alert('Oh no! error');
      } else {
        let json = res.body;
        console.log(json);
        console.log(json.data);
        this.props.back();
      }
    }.bind(this));
    console.log(this.state.title);
    console.log(api);
    console.log(send);
  },
  render() {
    let tag_list = (
      <ul className='dropdown-menu'>
        <li><a href='#' onClick={this.clickTagSelect}>tag1</a></li>
        <li><a href='#' onClick={this.clickTagSelect}>tag2</a></li>
      </ul>
    );
    let category_list = (
      <ul className='dropdown-menu'>
        <li><a href='#' onClick={this.clickCategorySelect}>category1</a></li>
        <li><a href='#' onClick={this.clickCategorySelect}>category2</a></li>
      </ul>
    );
    let form = (
      <form className='form-horizontal' onSubmit={this.handleSubmit}>
        <div className='form-group'>
          <input className='form-control' placeholder='Title'
            value={this.state.title} onChange={this.handleTitleChange} />
        </div>
        <div className='form-group'>
          <textarea className='form-control' rows='10' placeholder='Text(Markdown)'
            value={this.state.base} onChange={this.handleBaseChange} />
        </div>
        <div className='form-group'>
          <div className='row'>
            <div className='col-md-8'>
              <div className='input-group'>
                <div className='input-group-btn'>
                  <button className='btn btn-default dropdown-toggle' data-toggle='dropdown'
                    aria-haspopup='true' aria-expanded='false'>
                    Tag <span className='caret'></span>
                  </button>
                  {tag_list}
                </div>
                <div className='form-control' />
              </div>
            </div>
            <div className='col-md-4'>
              <div className='input-group'>
                <input className='form-control' placeholder='new tag...' />
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
              <div className='input-group'>
                <div className='input-group-btn'>
                  <button className='btn btn-default dropdown-toggle' data-toggle='dropdown'
                    aria-haspopup='true' aria-expanded='false'>
                    Category <span className='caret'></span>
                  </button>
                  {category_list}
                </div>
                <div className='form-control' />
              </div>
            </div>
            <div className='col-md-4'>
              <div className='input-group'>
                <input className='form-control' placeholder='new category...' />
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
