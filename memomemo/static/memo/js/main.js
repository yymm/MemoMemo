class Memo {
  constructor(id, title, text, html, date_time, tags, category) {
    this._id = id; // Integer
    this._title = title; // String
    this._text = text; // String
    this._html = html; // String
    this._date_time = date_time; // String
    this._tags = tags; // List<{id: <Integer>, name: <String>}>
    this._category = category; // {id: <Integer>, name: <String>}
  }
  get id() { return this._id; }
  get title() { return this._title; }
  get text() { return this._text; }
  get html() { return this._html; }
  get date_time() { return this._date_time; }
  get tags() { return this._tags; }
  get category() { return this._category; }
  update(title, text, html, date_time, tags, category) {
  }
}
let empty_memo = function() {
  return new Memo(-1, '', '', '', '', [], null);
};

let request = function(api, send, callback) {
  // handle single request(only POST) with superagent
  superagent
    .post(api)
    .send(send)
    .set('Accept', 'application/json')
    .end(function(err, res) {
      let ok = true;
      let type = '';
      let message = '';
      if (err || !res.ok) { // 500 Error
        ok = false;
        type = 'danger';
        message = 'Internal Server Error (See server logs for more infomation)';
      }
      else if (!res.body.ok) { // Response Error (Types = { ok: <Boolean>, data: <String> })
        ok = false;
        type = 'warning';
        message = res.body.data;
      }
      callback({
        ok: ok,
        type: type,
        message: message
      }, res);
    });
};

// 基本的にContainerが親玉
// ContainerのsetState処理を子のViewにpropsとして渡すことにより実行する
let Container = React.createClass({
  getInitialState: function() {
    return {
      data: [],
      view: <div>loading...</div>,
      alerts: []
    };
  },
  componentDidMount: function() {
    request('/api/read/memo', {}, function(err, res) {
      if (!err.ok) {
        this.alert(err.type, err.message);
        return;
      } else {
        let data = res.body.data.map(function(x) {
          return new Memo(
            x.id, x.title, x.text, x.html, x.date_time,
            x.tags, x.category
          );
        });
        this.setState({
          data: data,
          view: <MemoListView data={data} edit={this.edit} memoview={this.memoview} new={this.new} alert={this.alert} />
        });
      }
    }.bind(this));
  },
  // Router(Viewを生成)
  new: function() {
    this.setState({view: (
      <EditView back={this.back} memo={empty_memo()} alert={this.alert}>
      </EditView>
    )});
  },
  edit: function(memo) {
    this.setState({view: (
      <EditView back={this.back} memo={memo} alert={this.alert}>
      </EditView>
    )});
  },
  memoview: function(memo) {
    this.setState({view: (
      <MemoView back={this.back} memo={memo} alert={this.alert}>
      </MemoView>
    )});
  },
  back: function(e, is_update, memo) {
    if (memo) {
      console.log(e, memo);
      let m = new Memo(
          memo.id, memo.title, memo.text, memo.html, memo.date_time,
          memo.tags, memo.category
      );
      let data = this.state.data;
      if (is_update) {
        // update
        let index = data.findIndex(function(x) { return x.id === memo.id; });
        // dataが見つからないときの処理は下記の理由により未実装
        // edit中にdataを削除する動作はできない(他のユーザーからもできない)ため必ずfindIndexは成功する
        // if (index < 0) {
        //   return;
        // }
        data[index] = m;
      } else {
        // new
        data.push(m);
      }
      this.setState({
        data: data,
        view: <MemoListView data={this.state.data} edit={this.edit} memoview={this.memoview} new={this.new} alert={this.alert} />
      });
    } else {
      this.setState({
        view: <MemoListView data={this.state.data} edit={this.edit} memoview={this.memoview} new={this.new} alert={this.alert} />
      });
    }
  },
  alert: function(type, message) {
    let newAlerts = this.state.alerts.concat({type: type, message: message});
    this.setState({alerts: newAlerts});
  },
  render: function() {
    let alerts = this.state.alerts.map(function(x, i) { 
      let alert_remove = function(i) {
        let newAlerts = this.state.alerts.slice();
        newAlerts.splice(i, 1);
        this.setState({alerts: newAlerts});
      };
      return <Alert key={i} type={x.type} message={x.message} remove_self={alert_remove.bind(this, i)} />;
    }.bind(this));
    return (
      <div>
        <React.addons.CSSTransitionGroup transitionName='view-change' transitionAppear={true}>
          {alerts}
        </React.addons.CSSTransitionGroup>
        <div className='container'>
          {this.state.view}
        </div>
      </div>
    );
  }
});

let MemoListView = React.createClass ({
  propTypes: {
    data: React.PropTypes.arrayOf(React.PropTypes.instanceOf(Memo)).isRequired,
    edit: React.PropTypes.func.isRequired,
    memoview: React.PropTypes.func.isRequired,
    new: React.PropTypes.func.isRequired,
    alert: React.PropTypes.func.isRequired
  },
  render() {
    let memoNodes = this.props.data.map(function(memo) {
      return (
        <MemoBox memo={memo} key={memo.id} edit={this.props.edit} memoview={this.props.memoview} />
      );
    }.bind(this));
    return (
      <div className='row'>
        <div className='col-md-12 text-right'>
          <button className='btn btn-default' onClick={this.props.new}>new</button>
        </div>
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
    let tags = this.props.memo.tags.map(function(x) {
      return <button className='btn btn-success'>{x.name}</button>;
    });
    let category = null;
    if (this.props.memo.category) {
      category = <li className='btn btn-info'>{this.props.memo.category.name}</li>;
    }
    return (
      <React.addons.CSSTransitionGroup transitionName='view-change' transitionAppear={true}>
        <div className='col-md-6'>
          <div className='panel panel-default'>
            <div className='panel-heading'>
              <h1>{this.props.memo.title} <small>{this.props.memo.date_time}</small></h1>
              <div className='button-group'>
                <button className='btn btn-default' onClick={this.open_edit}>edit</button>
                <button className='btn btn-default' onClick={this.open_memoview}>view</button>
                {tags}
                {category}
              </div>
            </div>
            <div className='panel-body' dangerouslySetInnerHTML={ {__html: this.props.memo.html} } />
          </div>
        </div>
      </React.addons.CSSTransitionGroup>
    );
  }
});

let MemoView = React.createClass({
  propTypes: {
    back: React.PropTypes.func.isRequired,
    memo: React.PropTypes.instanceOf(Memo).isRequired,
    alert: React.PropTypes.func.isRequired
  },
  render() {
    let tags = this.props.memo.tags.map(function(x) {
      return <button className='btn btn-success'>{x.name}</button>;
    });
    let category = null;
    if (this.props.memo.category) {
      category = <li className='btn btn-info'>{this.props.memo.category.name}</li>;
    }
    return (
      <React.addons.CSSTransitionGroup transitionName='view-change' transitionAppear={true}>
        <div className='col-md-12'>
          <div onClick={this.props.back} className='glyphicon glyphicon-remove'></div>
          <div className='jumbotron'>
            <h1>{this.props.memo.title} <small>{this.props.memo.date_time}</small></h1>
            <div className='button-group'>
              {tags}
              {category}
            </div>
          </div>
          <div dangerouslySetInnerHTML={ {__html: this.props.memo.html} } />
        </div>
      </React.addons.CSSTransitionGroup>
    );
  }
});

let EditView = React.createClass({
  propTypes: {
    back: React.PropTypes.func.isRequired,
    memo: React.PropTypes.instanceOf(Memo).isRequired,
    alert: React.PropTypes.func.isRequired
  },
  getInitialState: function() {
    return {
      title: this.props.memo.title,
      text: this.props.memo.text,
      html: this.props.memo.html,
      tags: this.props.memo.tags,
      tag_options: [],
      tag_loading: true,
      tag_submit: false,
      new_tag: '',
      category: this.props.memo.category,
      new_category: '',
      category_options: [],
      category_loading: true,
      category_submit: false,
      submit: false
    };
  },
  componentDidMount: function() {
    this.getTagOptions();
    this.getCategoryOptions();
  },
  getTagOptions: function() {
    request('/api/read/tag', {}, function(err, res) {
      if (!err.ok) {
        this.props.alert(err.type, err.message);
        return;
      }
      let tag_options = res.body.data.map(function(x) { return {id: x.id, name: x.name}; });
      this.setState({
        tag_options: tag_options,
        tag_loading: false
      });
    }.bind(this));
  },
  getCategoryOptions: function() {
    request('/api/read/category', {}, function(err, res) {
      if (!err.ok) {
        this.props.alert(err.type, err.message);
        return;
      }
      let category_options = res.body.data.map(function(x) { return {id: x.id, name: x.name}; });
      this.setState({
        category_options: category_options,
        category_loading: false
      });
    }.bind(this));
  },
  clickTagCreate: function(e) {
    e.preventDefault();
    this.setState({tag_submit: true});
    request('/api/create/tag', {name: this.state.new_tag}, function(err) {
      this.setState({new_tag: '', tag_submit: false});
      if (!err.ok) {
        this.props.alert(err.type, err.message);
        return;
      } else {
        this.props.alert('success', 'Tag created!');
        this.getTagOptions();
      }
    }.bind(this));
  },
  clickCategoryCreate: function(e) {
    e.preventDefault();
    this.setState({category_submit: true});
    request('/api/create/category', {name: this.state.new_category}, function(err) {
      this.setState({new_category: '', category_submit: false});
      if (!err.ok) {
        this.props.alert(err.type, err.message);
        return;
      } else {
        this.props.alert('success', 'Category created!');
        this.getCategoryOptions();
      }
    }.bind(this));
  },
  handleTitleChange: function(e) {
    this.setState({title: e.target.value});
  },
  handleTextChange: function(e) {
    this.setState({text: e.target.value});
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
    if (this.state.title.trim().length == 0 ||
        this.state.text.trim().length == 0) {
      this.props.alert('warning', 'Empty Title or Text is invalid...');
      return;
    }
    let api = (this.props.memo.id < 0) ? '/api/create/memo' : '/api/update/memo';
    let is_update= (this.props.memo.id < 0) ? false : true;
    let send = {
      id: this.props.memo.id,
      title: this.state.title.trim(),
      text: this.state.text.trim(),
      tags: this.state.tags,
      category: this.state.category
    };
    request(api, send, function(err, res) {
      if (!err.ok) {
        this.props.alert(err.type, err.message);
        return;
      }
      this.props.back(e, is_update, res.body.data);
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
            value={this.state.text} onChange={this.handleTextChange} />
        </div>
        <div className='form-group'>
          <div className='row'>
            <div className='col-md-8'>
              <Select multi valueKey="id" labelKey="name"
                value={this.state.tags} options={this.state.tag_options}
                isLoading={this.state.tag_loading} onChange={this.handleTagChange} placeholder='Tags...' /> 
            </div>
            <div className='col-md-4'>
              <div className='input-group'>
                <input className='form-control' placeholder='new tag...'
                  value={this.state.new_tag} onChange={this.handleNewTagChange}/>
                <div className='input-group-btn'>
                  <button disabled={this.state.tag_submit} className='btn btn-default' onClick={this.clickTagCreate}>Create</button>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className='form-group'>
          <div className='row'>
            <div className='col-md-8'>
              <Select valueKey="id" labelKey="name"
                value={this.state.category} options={this.state.category_options}
                isLoading={this.state.category_loading} onChange={this.handleCategoryChange} placeholder='Category...' /> 
            </div>
            <div className='col-md-4'>
              <div className='input-group'>
                <input className='form-control' placeholder='new category...'
                  value={this.state.new_category} onChange={this.handleNewCategoryChange}/>
                <div className='input-group-btn'>
                  <button disabled={this.state.category_submit} className='btn btn-default' onClick={this.clickCategoryCreate}>Create</button>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className='form-group'>
          <button disabled={this.state.submit} type='submit' className='btn btn-default'>Submit</button>
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

let Alert = React.createClass({
  propTypes: {
    type: React.PropTypes.oneOf(['success', 'info', 'warning', 'danger']),
    message: React.PropTypes.string.isRequired,
    remove_self: React.PropTypes.func.isRequired
  },
  componentDidMount: function() {
    let delay = 10000;
    if (this.props.type == 'success' ||
        this.props.type == 'info') {
      delay = 5000;
    }
    setTimeout(this.props.remove_self, delay);
  },
  render() {
    let alertClass = 'text-center alert alert-float alert-' + this.props.type;
    let glyphiconClass = 'glyphicon glyphicon-';
    switch (this.props.type) {
    case 'success':
      glyphiconClass += 'thumbs-up';
      break;
    case 'info':
      glyphiconClass += 'info-sign';
      break;
    case 'warning':
      glyphiconClass += 'exclamation-sign';
      break;
    case 'danger':
      glyphiconClass += 'fire';
      break;
    default:
      glyphiconClass += 'question-sign';
    }
    let strong = this.props.type.charAt(0).toUpperCase() + this.props.type.slice(1);
    return (
      <div className={alertClass} onClick={this.props.remove_self}>
        <button className="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button>
        <strong>{strong} <span className={glyphiconClass} aria-hidden="true"></span></strong> {this.props.message}
      </div>
    );
  }
});

ReactDOM.render(
  <Container />, document.getElementById('content')
);
