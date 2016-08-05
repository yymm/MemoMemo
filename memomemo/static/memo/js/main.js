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
  getInitialState() {
    return {
      data: [],
      view: <div>loading...</div>,
      isShowAlert: false,
      isShowConfirm: false
    };
  },
  componentDidMount() {
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
          view: <MemoListView data={data} edit={this.edit} memoview={this.memoview} new={this.new} />
        });
      }
    }.bind(this));
  },
  // Router(Viewを生成)
  new() {
    this.setState({view: (
      <EditView back={this.back} memo={empty_memo()} alert={this.alert}>
      </EditView>
    )});
  },
  edit(memo) {
    this.setState({view: (
      <EditView back={this.back} memo={memo} alert={this.alert}>
      </EditView>
    )});
  },
  memoview(memo) {
    this.setState({view: (
      <MemoView back={this.back} memo={memo} edit={this.edit} alert={this.alert} confirm={this.confirm}>
      </MemoView>
    )});
  },
  back(e, operation, memo) {
    if (memo) {
      let m = new Memo(
          memo.id, memo.title, memo.text, memo.html, memo.date_time,
          memo.tags, memo.category
      );
      let data = this.state.data;
      if (operation === 'update') {
        let index = data.findIndex(function(x) { return x.id === memo.id; });
        // dataが見つからないときの処理は下記の理由により未実装
        // edit中にdataを削除する動作はできない(他のユーザーからもできない)ため必ずfindIndexは成功する
        // if (index < 0) {
        //   return;
        // }
        data[index] = m;
      } else if (operation === 'create') {
        data.push(m);
      } else if (operation === 'delete') {
        let index = data.findIndex(function(x) { return x.id === memo.id; });
        data.splice(index, 1);
      } else {
        this.alert('warning', 'Invalod operation!');
      }
      this.setState({
        data: data,
        view: <MemoListView data={this.state.data} edit={this.edit} memoview={this.memoview} new={this.new} />
      });
    } else {
      this.setState({
        view: <MemoListView data={this.state.data} edit={this.edit} memoview={this.memoview} new={this.new} />
      });
    }
  },
  // Notifications
  alert(type, message) {
    this.setState({
      isShowAlert: true,
      alertType: type,
      alertMessage: message
    });
  },
  alert_out() {
    this.setState({
      isShowAlert: false
    });
  },
  confirm(title, message, callback) {
    this.setState({
      isShowConfirm: true,
      confirmTitle: title,
      confirmMessage: message,
      confirmCallback: callback
    });
  },
  confirm_out() {
    this.setState({
      isShowConfirm: false
    });
  },
  render() {
    return (
      <div>
        {
          this.state.isShowAlert &&
            <Alert type={this.state.alertType} message={this.state.alertMessage} remove={this.alert_out} />
        }
        {
          this.state.isShowConfirm &&
            <Confirm title={this.state.confirmTitle} message={this.state.confirmMessage} callback={this.state.confirmCallback} remove={this.confirm_out} />
        }
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
          <div className='panel panel-default memobox'>
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
    edit: React.PropTypes.func.isRequired,
    alert: React.PropTypes.func.isRequired,
    confirm: React.PropTypes.func.isRequired
  },
  open_edit() {
    this.props.edit(this.props.memo);
  },
  delete() {
    this.props.confirm('Are you sure?', 'Do you delete this article?', function() {
      // delete
      request('/api/delete/memo', {id: this.props.memo.id}, function(err, res) {
        if (!err.ok) {
          this.props.alert(err.type, err.message);
          return;
        } else {
          this.props.back(null, 'delete', res.body.data);
          this.props.alert('success', 'Successfully deleted!');
        }
      }.bind(this));
    }.bind(this));
  },
  slide() {
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
              <button className='btn btn-default' onClick={this.open_edit}>Edit</button>
              <button className='btn btn-primary' onClick={this.slide}>Slide Show</button>
              {tags}
              {category}
              <button className='btn btn-danger' onClick={this.delete}>Eelete</button>
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
  getInitialState() {
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
      submit: false,
      active: true,
      preview: ''
    };
  },
  componentDidMount() {
    this.getTagOptions();
    this.getCategoryOptions();
  },
  getTagOptions() {
    request('/api/read/tag', {}, function(err, res) {
      if (!err.ok) {
        this.props.alert(err.type, err.message);
        return;
      } else {
        let tag_options = res.body.data.map(function(x) { return {id: x.id, name: x.name}; });
        this.setState({
          tag_options: tag_options,
          tag_loading: false
        });
      }
    }.bind(this));
  },
  getCategoryOptions() {
    request('/api/read/category', {}, function(err, res) {
      if (!err.ok) {
        this.props.alert(err.type, err.message);
        return;
      } else {
        let category_options = res.body.data.map(function(x) { return {id: x.id, name: x.name}; });
        this.setState({
          category_options: category_options,
          category_loading: false
        });
      }
    }.bind(this));
  },
  clickTagCreate(e) {
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
  clickCategoryCreate(e) {
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
  handleTitleChange(e) {
    this.setState({title: e.target.value});
  },
  handleTextChange(e) {
    this.setState({text: e.target.value});
  },
  handleNewTagChange(e) {
    this.setState({new_tag: e.target.value});
  },
  handleNewCategoryChange(e) {
    this.setState({new_category: e.target.value});
  },
  handleTagChange(value) {
    this.setState({tags: value});
  },
  handleCategoryChange(value) {
    this.setState({category: value});
  },
  handleSubmit(e) {
    e.preventDefault();
    if (this.state.title.trim().length == 0 ||
        this.state.text.trim().length == 0) {
      this.props.alert('warning', 'Empty Title or Text is invalid...');
      return;
    }
    let api = (this.props.memo.id < 0) ? '/api/create/memo' : '/api/update/memo';
    let operation = (this.props.memo.id < 0) ? 'create': 'update';
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
      let msg = (this.props.memo.id < 0) ? 'Memo created!' : 'Memo updated!';
      this.props.back(e, operation, res.body.data);
      this.props.alert('success', msg);
    }.bind(this));
  },
  handlePreview(e) {
    e.preventDefault();
    request('/api/preview', {text: this.state.text}, (err, res) => {
      if (!err.ok) {
        this.props.alert(err.type, err.message);
        return;
      } else {
        this.setState({preview: res.body.data});
      }
    });
    this.setState({active: false});
  },
  handleEdit(e) {
    e.preventDefault();
    this.setState({active: true});
  },
  render() {
    let active_textarea = classNames(
      {active: this.state.active}
    );
    let active_preview = classNames(
      {active: !this.state.active}
    );
    let form = (
      <form className='form-horizontal' onSubmit={this.handleSubmit}>
        <div className='form-group'>
          <input className='form-control' placeholder='Title'
            value={this.state.title} onChange={this.handleTitleChange} />
        </div>
        <div className='form-group'>
          <ul className='nav nav-pills'>
            <li className={active_textarea}><a href='#' onClick={this.handleEdit}>Edit</a></li>
            <li className={active_preview}><a href='#' onClick={this.handlePreview}>Preview</a></li>
          </ul>
          {
            (this.state.active) ?
            <textarea className='form-control' rows='25' placeholder='Text(Markdown)'
              value={this.state.text} onChange={this.handleTextChange} />
            :
            <div className='form-control preview' dangerouslySetInnerHTML={ {__html: this.state.preview} } />
          }
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
      <div>
        <div onClick={this.props.back} className='glyphicon glyphicon-remove'></div>
        {form}
      </div>
    );
  }
});

let Alert = React.createClass({
  propTypes: {
    type: React.PropTypes.oneOf(['success', 'info', 'warning', 'danger']),
    message: React.PropTypes.string,
    remove: React.PropTypes.func.isRequired
  },
  getInitialState() {
    return {fadeout: false};
  },
  componentDidMount() {
    let delay = 10000;
    if (this.props.type == 'success' ||
        this.props.type == 'info') {
      delay = 5000;
    }
    setTimeout(this.remove, delay);
  },
  remove() {
    this.setState({fadeout: true});
    setTimeout(this.props.remove, 500);
  },
  render() {
    let alertClass = classNames(
      'alert-float',
      'notification-fadein',
      {'notification-fadeout': this.state.fadeout},
      'text-center',
      'alert',
      'alert-' + this.props.type
    );
    let icon = '';
    switch (this.props.type) {
    case 'success':
      icon = 'thumbs-up';
      break;
    case 'info':
      icon = 'info-sign';
      break;
    case 'warning':
      icon = 'exclamation-sign';
      break;
    case 'danger':
      icon = 'fire';
      break;
    default:
      icon = 'question-sign';
    }
    let glyphiconClass = classNames(
      'glyphicon',
      'glyphicon-' + icon
    );
    let strong = this.props.type.charAt(0).toUpperCase() + this.props.type.slice(1);
    return (
      <div className={alertClass} style={ {zIndex: 100} } onClick={this.remove}>
        <button className="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button>
        <strong>{strong} <span className={glyphiconClass} aria-hidden="true"></span></strong> {this.props.message}
      </div>
    );
  }
});

let Confirm = React.createClass({
  propTypes: {
    title: React.PropTypes.string,
    message: React.PropTypes.string,
    callback: React.PropTypes.func.isRequired,
    remove: React.PropTypes.func.isRequired
  },
  getInitialState() {
    return {fadeout: false};
  },
  remove() {
    this.setState({fadeout: true});
    setTimeout(this.props.remove, 500);
  },
  ok() {
    this.props.callback();
    this.setState({fadeout: true});
    setTimeout(this.props.remove, 500);
  },
  render() {
    const style = {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 200
    };
    const overlayStyle = {
      position: 'fixed',
      backgroundColor: '#182738',
      opacity: 0.8,
      top: 0,
      left: 0,
      height: '100%',
      width: '100%'
    };
    const overlayClass = classNames(
      'notification-fadein',
      {'notification-fadeout': this.state.fadeout}
    );
    const dialogClass = classNames(
      'modal-dialog',
      'notification-fadein',
      {'notification-fadeout': this.state.fadeout}
    );
    return (
      <div style={style}>
        <div style={overlayStyle} className={overlayClass} onClick={this.remove} />
        <div className={dialogClass} role="document">
          <div className="modal-content">
            <div className="modal-header">
              <button type="button" className="close" data-dismiss="modal" aria-label="Close" onClick={this.remove}><span aria-hidden="true">&times;</span></button>
              <h4 className="modal-title">{this.props.title}</h4>
            </div>
            <div className="modal-body">
              <p>{this.props.message}</p>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-default" data-dismiss="modal" onClick={this.remove}>Cancel</button>
              <button type="button" className="btn btn-primary" onClick={this.ok}>Ok</button>
            </div>
          </div>
        </div>
      </div>
    );
  }
});

ReactDOM.render(
  <Container />,
  document.getElementById('content')
);
